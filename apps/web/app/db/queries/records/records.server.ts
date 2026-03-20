import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import * as Sentry from "@sentry/react-router/cloudflare";

import type { CreateRecordInput, RecordFilterInput } from "../../../lib/auth/validation";
import { DEFAULT_RECORD_TYPE, type RecordType } from "../../../lib/constants/record-types";
import { parseDateToUnix } from "../../../lib/utils/date";
import { compareRecordStates, computeTagDiff, hasActualChanges } from "../../../lib/utils/record-diff";
import { nanoid } from "../../../lib/utils/utils.server";
import { createAuditLog } from "../admin/insights/audit-helpers.server";
import { createRevision, getLatestRevisionNumber } from "./revisions.server";
import { db } from "../../client.server";
import { learnerProfiles, records } from "../../schema.server";

interface RecordVisibilityScope {
  viewerUserId: string | null;
  viewerCohort: string | null;
  includeRestricted?: boolean;
}

function buildAccessibleRecordVisibilityCondition(scope: RecordVisibilityScope) {
  if (scope.includeRestricted) {
    return sql`1=1`;
  }

  if (!scope.viewerUserId) {
    return eq(records.visibility, "public");
  }

  if (scope.viewerCohort) {
    return sql`(
      ${records.authorId} = ${scope.viewerUserId}
      OR ${records.visibility} = 'public'
      OR (${records.visibility} = 'cohort' AND ${records.cohort} = ${scope.viewerCohort})
    )`;
  }

  return sql`(${records.authorId} = ${scope.viewerUserId} OR ${records.visibility} = 'public')`;
}

export async function getNextRecordSlug(d1: D1Database): Promise<string> {
  const database = db(d1);
  const result = await database
    .select({ maxNum: sql<number>`COALESCE(MAX(CAST(${records.slug} AS INTEGER)), 0)` })
    .from(records);
  return String((result[0]?.maxNum ?? 0) + 1);
}

export async function getRecords(d1: D1Database, filters: RecordFilterInput = { page: 1 }) {
  const database = db(d1);
  const conditions = [];

  if (filters.format) {
    conditions.push(eq(records.format, filters.format));
  }

  if (filters.type) {
    conditions.push(eq(records.type, filters.type));
  }

  if (filters.rhythm) {
    conditions.push(eq(records.rhythm, filters.rhythm));
  }

  if (filters.cohort) {
    conditions.push(eq(records.cohort, filters.cohort));
  }

  conditions.push(sql`${records.visibility} IN ('cohort', 'public')`);

  const pageSize = 20;
  const offset = (filters.page - 1) * pageSize;
  const orderBy = filters.sort === "oldest" ? [asc(records.createdAt)] : [desc(records.createdAt)];

  return database
    .select({
      record: records,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset(offset);
}

export async function getRecordBySlug(d1: D1Database, slug: string, currentUserId?: string) {
  const database = db(d1);
  const result = await database
    .select({
      record: records,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        userId: learnerProfiles.userId,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(eq(records.slug, slug))
    .limit(1);

  const recordData = result[0] ?? null;
  
  if (
    recordData
    && (recordData.record.visibility === "draft" || recordData.record.visibility === "private")
    && currentUserId
    && currentUserId !== recordData.record.authorId
  ) {
    return null;
  }

  return recordData;
}

export async function getRecordsByAuthor(d1: D1Database, authorId: string, includePrivate = false) {
  const database = db(d1);
  const conditions = [eq(records.authorId, authorId)];

  if (!includePrivate) {
    conditions.push(sql`${records.visibility} IN ('cohort', 'public')`);
  }

  return database.select().from(records).where(and(...conditions)).orderBy(desc(records.createdAt));
}

export async function createRecord(d1: D1Database, authorId: string, data: CreateRecordInput) {
  const database = db(d1);
  const id = nanoid();
  const slug = await getNextRecordSlug(d1);
  const now = Math.floor(Date.now() / 1000);

  const recordData = {
    id,
    slug,
    authorId,
    title: data.title,
    content: data.content,
    contentText: data.contentText ?? "",
    format: data.format ?? "note",
    type: data.type ?? DEFAULT_RECORD_TYPE,
    rhythm: data.rhythm ?? "free",
    visibility: data.visibility ?? "public",
    responsePreference: data.responsePreference ?? "open",
    searchIndexingOptOut: data.searchIndexingOptOut ?? false,
    challengeId: data.challengeId ?? null,
    collaborationUnitId: data.collaborationUnitId ?? null,
    recordedAt: parseDateToUnix(data.recordedAt),
    recordedEndAt: parseDateToUnix(data.recordedEndAt),
    createdAt: now,
    updatedAt: now,
  };

  await database.insert(records).values(recordData);

  try {
    await createAuditLog(d1, {
      actorId: authorId,
      targetType: "record",
      targetId: id,
      action: "create",
      beforeState: null,
      afterState: recordData,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { type: "audit_log" } });
  }

  return { id, slug };
}

export async function updateRecord(
  d1: D1Database,
  id: string,
  authorId: string,
  data: Partial<CreateRecordInput>,
  options?: {
    oldTags?: Array<{ id: string; name: string }>;
    newTags?: Array<{ id: string; name: string }>;
  },
): Promise<{ updated: boolean; revisionCreated: boolean }> {
  const database = db(d1);

  const existing = await database
    .select()
    .from(records)
    .where(and(eq(records.id, id), eq(records.authorId, authorId)))
    .limit(1);

  if (!existing[0]) {
    return { updated: false, revisionCreated: false };
  }

  const currentRecord = existing[0];
  const currentRecordForDiff = {
    ...currentRecord,
    contentText: currentRecord.contentText ?? undefined,
    type: currentRecord.type as RecordType,
  };
  const auditAfterState = { ...currentRecord, ...data };
  const nextRecordState = {
    ...currentRecordForDiff,
    ...data,
    type: (data.type ?? currentRecordForDiff.type) as RecordType,
  };
  const fieldChanges = compareRecordStates(currentRecordForDiff, nextRecordState);
  const tagDiff = computeTagDiff(options?.oldTags ?? [], options?.newTags ?? []);
  const hasTagChanges = tagDiff.added.length > 0 || tagDiff.removed.length > 0;
  const hasChanges = hasActualChanges(currentRecordForDiff, nextRecordState) || hasTagChanges;

  if (!hasChanges) {
    return { updated: false, revisionCreated: false };
  }

  const changedFieldNames = fieldChanges.map((change) => change.field);
  if (hasTagChanges) {
    changedFieldNames.push("tags");
  }

  let revisionCreated = false;

  const updateData: Partial<CreateRecordInput> & { updatedAt: number } = {
    ...data,
    updatedAt: Math.floor(Date.now() / 1000),
  };

  // Convert date strings to Unix timestamps
  const setData: Record<string, unknown> = { ...updateData };
  if (data.recordedAt !== undefined) {
    setData.recordedAt = parseDateToUnix(data.recordedAt);
  }
  if (data.recordedEndAt !== undefined) {
    setData.recordedEndAt = parseDateToUnix(data.recordedEndAt);
  }

  try {
    await database
      .update(records)
      .set(setData)
      .where(and(eq(records.id, id), eq(records.authorId, authorId)));

    try {
      const latestRevisionNumber = await getLatestRevisionNumber(d1, id);
      await createRevision(d1, {
        recordId: id,
        authorId,
        revisionNumber: latestRevisionNumber + 1,
        snapshot: currentRecord as Record<string, unknown>,
        changedFields: changedFieldNames,
        tagsSnapshot: options?.oldTags,
      });
      revisionCreated = true;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { type: "revision_write", operation: "update_record" },
        extra: { recordId: id, authorId },
      });
    }

    try {
      await createAuditLog(d1, {
        actorId: authorId,
        targetType: "record",
        targetId: id,
        action: "update",
        beforeState: currentRecord as Record<string, unknown>,
        afterState: auditAfterState as Record<string, unknown>,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { type: "audit_log", operation: "update_record" },
        extra: { recordId: id, authorId },
      });
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { type: "record_update", operation: "update_record" },
      extra: { recordId: id, authorId },
    });
    throw err;
  }

  return { updated: true, revisionCreated };
}

export async function getDraftRecords(d1: D1Database, authorId: string) {
  const database = db(d1);

  return database
    .select()
    .from(records)
    .where(and(eq(records.authorId, authorId), eq(records.visibility, "draft")))
    .orderBy(desc(records.updatedAt));
}

export async function searchRecordsByKeyword(d1: D1Database, keyword: string, cohort?: string) {
  const database = db(d1);
  const pattern = `%${keyword}%`;
  const conditions = [
    or(like(records.title, pattern), like(records.contentText, pattern)),
    sql`${records.visibility} IN ('cohort', 'public')`,
  ];

  if (cohort) {
    conditions.push(eq(records.cohort, cohort));
  }

  return database
    .select()
    .from(records)
    .where(and(...conditions))
    .orderBy(desc(records.createdAt))
    .limit(20);
}

export type LinkedRecordDirection = "outgoing" | "incoming";

export interface LinkedRecord {
  record: {
    id: string;
    slug: string;
    title: string;
    content: string;
    format: "note" | "article";
    type: RecordType;
    createdAt: number;
  };
  author: {
    displayName: string | null;
    slug: string | null;
  } | null;
  direction: LinkedRecordDirection;
}

export async function getLinkedRecords(
  d1: D1Database,
  recordId: string,
  linkedRecordId: string | null,
  scope: RecordVisibilityScope,
): Promise<LinkedRecord[]> {
  const database = db(d1);
  const results: LinkedRecord[] = [];
  const visibilityCondition = buildAccessibleRecordVisibilityCondition(scope);

  if (linkedRecordId) {
    const outgoing = await database
      .select({
        record: {
          id: records.id,
          slug: records.slug,
          title: records.title,
          content: records.content,
          format: records.format,
          type: records.type,
          createdAt: records.createdAt,
        },
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(
        and(
          eq(records.id, linkedRecordId),
          visibilityCondition,
        ),
      )
      .limit(1);

    for (const row of outgoing) {
      results.push({
        record: {
          ...row.record,
          format: row.record.format as "note" | "article",
          type: row.record.type as RecordType,
        },
        author: row.author,
        direction: "outgoing",
      });
    }
  }

  const incoming = await database
    .select({
      record: {
        id: records.id,
        slug: records.slug,
        title: records.title,
        content: records.content,
        format: records.format,
        type: records.type,
        createdAt: records.createdAt,
      },
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(
      and(
        eq(records.linkedRecordId, recordId),
        visibilityCondition,
      ),
    )
    .orderBy(desc(records.createdAt))
    .limit(5);

  for (const row of incoming) {
    results.push({
      record: {
        ...row.record,
        format: row.record.format as "note" | "article",
        type: row.record.type as RecordType,
      },
      author: row.author,
      direction: "incoming",
    });
  }

  return results;
}

export async function getRecordById(d1: D1Database, id: string) {
  const database = db(d1);
  const result = await database
    .select()
    .from(records)
    .where(eq(records.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateRecordOriginalMeta(
  d1: D1Database,
  recordId: string,
  meta: {
    originalUrl: string | null;
    originalTitle: string | null;
    originalDescription: string | null;
  }
): Promise<void> {
  const database = db(d1);
  await database
    .update(records)
    .set({
      originalUrl: meta.originalUrl,
      originalTitle: meta.originalTitle,
      originalDescription: meta.originalDescription,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(records.id, recordId));
}
