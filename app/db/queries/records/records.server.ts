import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import * as Sentry from "@sentry/react-router/cloudflare";

import type { CreateRecordInput, RecordFilterInput } from "../../../lib/auth/validation";
import { compareRecordStates, computeTagDiff, hasActualChanges } from "../../../lib/utils/record-diff";
import { nanoid } from "../../../lib/utils/utils.server";
import { createAuditLog } from "../admin/insights/audit-helpers.server";
import { createRevision, getLatestRevisionNumber } from "./revisions.server";
import { db } from "../../client.server";
import { learnerProfiles, records, stages } from "../../schema.server";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

export async function getRecords(d1: D1Database, filters: RecordFilterInput = { page: 1 }) {
  const database = db(d1);
  const conditions = [];

  if (filters.stage) {
    conditions.push(eq(records.stageId, filters.stage));
  }

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

  conditions.push(sql`${records.visibility} != 'draft'`);

  const pageSize = 20;
  const offset = (filters.page - 1) * pageSize;
  const orderBy =
    filters.sort === "stage"
      ? [asc(stages.order), desc(records.createdAt)]
      : filters.sort === "oldest"
        ? [asc(records.createdAt)]
        : [desc(records.createdAt)];

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
    .leftJoin(stages, eq(records.stageId, stages.id))
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
  
  // Defense-in-depth: if record is draft and user is not author, return null
  if (recordData && recordData.record.visibility === "draft" && currentUserId && currentUserId !== recordData.record.authorId) {
    return null;
  }

  return recordData;
}

export async function getRecordsByAuthor(d1: D1Database, authorId: string, includePrivate = false) {
  const database = db(d1);
  const conditions = [eq(records.authorId, authorId)];

  if (!includePrivate) {
    conditions.push(sql`${records.visibility} != 'draft'`);
  }

  return database.select().from(records).where(and(...conditions)).orderBy(desc(records.createdAt));
}

export async function createRecord(d1: D1Database, authorId: string, data: CreateRecordInput) {
  const database = db(d1);
  const id = nanoid();
  const baseSlug = slugify(data.title);
  const slug = `${baseSlug}-${id.substring(0, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  const recordData = {
    id,
    slug,
    authorId,
    title: data.title,
    content: data.content,
    contentText: data.contentText ?? "",
    format: data.format ?? "note",
    type: data.type ?? "personal",
    rhythm: data.rhythm ?? "free",
    visibility: data.visibility ?? "cohort",
    responsePreference: data.responsePreference ?? "open",
    stageId: data.stageId ?? null,
    challengeId: data.challengeId ?? null,
    collaborationUnitId: data.collaborationUnitId ?? null,
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
  };
  const auditAfterState = { ...currentRecord, ...data };
  const nextRecordState = { ...currentRecordForDiff, ...data };
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
    console.error("[revision] Failed to create revision:", err);
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
    console.error("[audit] Failed to create audit log:", err);
  }

  await database
    .update(records)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(and(eq(records.id, id), eq(records.authorId, authorId)));

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
    sql`${records.visibility} != 'draft'`,
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
    type: "personal" | "challenge" | "collaboration";
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
): Promise<LinkedRecord[]> {
  const database = db(d1);
  const results: LinkedRecord[] = [];

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
          sql`${records.visibility} != 'draft'`,
        ),
      )
      .limit(1);

    for (const row of outgoing) {
      results.push({
        record: {
          ...row.record,
          format: row.record.format as "note" | "article",
          type: row.record.type as "personal" | "challenge" | "collaboration",
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
        sql`${records.visibility} != 'draft'`,
      ),
    )
    .orderBy(desc(records.createdAt))
    .limit(5);

  for (const row of incoming) {
    results.push({
      record: {
        ...row.record,
        format: row.record.format as "note" | "article",
        type: row.record.type as "personal" | "challenge" | "collaboration",
      },
      author: row.author,
      direction: "incoming",
    });
  }

  return results;
}
