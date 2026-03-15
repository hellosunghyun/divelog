import { eq } from "drizzle-orm";
import { db } from "../client.server";
import { mentions, learnerProfiles } from "../schema.server";
import { nanoid } from "../../lib/utils.server";

export async function syncMentionsForRecord(
  d1: D1Database,
  recordId: string,
  authorId: string,
  mentionedSlugs: string[],
) {
  const database = db(d1);
  await database.delete(mentions).where(eq(mentions.recordId, recordId));

  const now = Math.floor(Date.now() / 1000);
  for (const slugOrId of mentionedSlugs) {
    const learnerResult = await database
      .select({ userId: learnerProfiles.userId })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.slug, slugOrId))
      .limit(1);

    const resolvedUserId = learnerResult[0]?.userId ?? slugOrId;

    await database.insert(mentions).values({
      id: nanoid(),
      recordId,
      mentionedUserId: resolvedUserId,
      mentionedById: authorId,
      createdAt: now,
    });
  }
}

export async function getMentionsByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);
  return database
    .select({
      mentionId: mentions.id,
      userId: mentions.mentionedUserId,
      displayName: learnerProfiles.displayName,
      slug: learnerProfiles.slug,
      profilePhotoUrl: learnerProfiles.profilePhotoUrl,
    })
    .from(mentions)
    .leftJoin(learnerProfiles, eq(mentions.mentionedUserId, learnerProfiles.userId))
    .where(eq(mentions.recordId, recordId));
}

export async function getMentionsOfUser(d1: D1Database, userId: string, limit = 10) {
  const database = db(d1);
  const { records } = await import("../schema.server");
  return database
    .select({
      mentionId: mentions.id,
      recordId: mentions.recordId,
      recordTitle: records.title,
      recordSlug: records.slug,
      mentionedByDisplayName: learnerProfiles.displayName,
    })
    .from(mentions)
    .leftJoin(records, eq(mentions.recordId, records.id))
    .leftJoin(learnerProfiles, eq(mentions.mentionedById, learnerProfiles.userId))
    .where(eq(mentions.mentionedUserId, userId))
    .limit(limit);
}
