import { eq, or, and, sql } from "drizzle-orm";
import { db } from "../../client.server";
import { recordLinks, records, learnerProfiles } from "../../schema.server";
import { nanoid } from "../../../lib/utils/utils.server";

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

  const now = Math.floor(Date.now() / 1000);
  for (const ref of refs) {
    await database.insert(recordLinks).values({
      id: nanoid(),
      sourceRecordId,
      targetRecordId: ref.recordId,
      linkType: "reference",
      createdAt: now,
    });
  }
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

export async function getIncomingLinks(d1: D1Database, targetRecordId: string) {
  const database = db(d1);
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
        sql`${records.visibility} IN ('cohort', 'public')`,
      ),
    );
}
