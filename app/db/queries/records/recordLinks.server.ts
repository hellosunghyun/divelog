import { eq, or, and, sql } from "drizzle-orm";
import { db } from "../../client.server";
import { recordLinks, records, learnerProfiles } from "../../schema.server";
import { nanoid } from "../../../lib/utils/utils.server";

interface RecordLinkVisibilityScope {
  viewerUserId: string | null;
  viewerCohort: string | null;
  includeRestricted?: boolean;
}

function buildAccessibleSourceRecordCondition(scope: RecordLinkVisibilityScope) {
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

interface CreateLinkInput {
  sourceRecordId: string;
  targetRecordId: string;
  linkType: string;
  quotedText?: string | null;
}

export async function createLink(d1: D1Database, input: CreateLinkInput) {
  const database = db(d1);
  await database.insert(recordLinks).values({
    id: nanoid(),
    sourceRecordId: input.sourceRecordId,
    targetRecordId: input.targetRecordId,
    linkType: input.linkType,
    quotedText: input.quotedText ?? null,
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export async function syncRecordLinksForRecord(
  d1: D1Database,
  sourceRecordId: string,
  refs: Array<{ recordId: string; recordSlug: string; recordTitle: string }>,
) {
  const database = db(d1);
  await database.delete(recordLinks).where(eq(recordLinks.sourceRecordId, sourceRecordId));

  if (refs.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  await database.insert(recordLinks).values(
    refs.map((ref) => ({
      id: nanoid(),
      sourceRecordId,
      targetRecordId: ref.recordId,
      linkType: "reference",
      createdAt: now,
    }))
  );
}

export async function getRecordLinksByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);
  return database
    .select({
      linkId: recordLinks.id,
      sourceRecordId: recordLinks.sourceRecordId,
      targetRecordId: recordLinks.targetRecordId,
      linkType: recordLinks.linkType,
      quotedText: recordLinks.quotedText,
      targetTitle: records.title,
      targetSlug: records.slug,
      authorDisplayName: learnerProfiles.displayName,
      authorSlug: learnerProfiles.slug,
    })
    .from(recordLinks)
    .leftJoin(records, eq(recordLinks.targetRecordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(
      and(
        or(
          eq(recordLinks.sourceRecordId, recordId),
          eq(recordLinks.targetRecordId, recordId),
        ),
        sql`${records.visibility} IN ('cohort', 'public')`,
      ),
    );
}

export async function getIncomingLinks(
  d1: D1Database,
  targetRecordId: string,
  scope: RecordLinkVisibilityScope,
) {
  const database = db(d1);
  const visibilityCondition = buildAccessibleSourceRecordCondition(scope);

  return database
    .select({
      linkId: recordLinks.id,
      sourceRecordId: recordLinks.sourceRecordId,
      linkType: recordLinks.linkType,
      sourceTitle: records.title,
      sourceSlug: records.slug,
      sourceAuthorName: learnerProfiles.displayName,
      sourceAuthorSlug: learnerProfiles.slug,
    })
    .from(recordLinks)
    .leftJoin(records, eq(recordLinks.sourceRecordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(
      and(
        eq(recordLinks.targetRecordId, targetRecordId),
        visibilityCondition,
      ),
    );
}

export async function syncTypedRecordLinks(
  d1: D1Database,
  sourceRecordId: string,
  targetRecordIds: string[],
  linkType: string,
): Promise<void> {
  const database = db(d1);
  // linkType별로 스코프 삭제 (다른 linkType은 보존)
  await database.delete(recordLinks).where(
    and(
      eq(recordLinks.sourceRecordId, sourceRecordId),
      eq(recordLinks.linkType, linkType),
    )
  );

  if (targetRecordIds.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  await database.insert(recordLinks).values(
    targetRecordIds.map((targetId) => ({
      id: nanoid(),
      sourceRecordId,
      targetRecordId: targetId,
      linkType,
      quotedText: null,
      createdAt: now,
    }))
  );
}

export async function getTypedRecordLinks(
  d1: D1Database,
  sourceRecordId: string,
  linkType: string,
) {
  const database = db(d1);
  return database
    .select({
      targetRecordId: recordLinks.targetRecordId,
      targetTitle: records.title,
      targetSlug: records.slug,
      authorDisplayName: learnerProfiles.displayName,
    })
    .from(recordLinks)
    .leftJoin(records, eq(recordLinks.targetRecordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(
      and(
        eq(recordLinks.sourceRecordId, sourceRecordId),
        eq(recordLinks.linkType, linkType),
      )
    );
}
