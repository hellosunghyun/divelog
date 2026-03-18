import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../../client.server";
import { mentions, learnerProfiles, records } from "../../schema.server";
import { nanoid } from "../../../lib/utils/utils.server";

/**
 * @deprecated Use syncAllMentionsForRecord instead.
 * This function will be removed in a future version.
 */
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

/**
 * Sync all mentions for a record from both explicit user IDs and content-extracted mentions.
 * Merges both sources, removes duplicates, and replaces all existing mentions for the record.
 *
 * @param d1 - D1 database instance
 * @param recordId - Record ID to sync mentions for
 * @param explicitUserIds - User IDs explicitly selected by the author
 * @param content - Record content (Tiptap JSON) to extract mentions from
 * @param mentionedById - User ID of the person creating/updating the record
 */
export async function syncAllMentionsForRecord(
  d1: D1Database,
  recordId: string,
  explicitUserIds: string[],
  content: string,
  mentionedById: string,
) {
  const database = db(d1);

  // Extract mentions from content (Tiptap JSON)
  const extractedMentions = extractMentionsFromContent(content);
  const extractedUserIds = extractedMentions.map((m) => m.userId);

  // Merge explicit and extracted mentions using Set to remove duplicates
  const allUserIds = Array.from(new Set([...explicitUserIds, ...extractedUserIds]));

  // Delete all existing mentions for this record
  await database.delete(mentions).where(eq(mentions.recordId, recordId));

  // Insert new mentions
  if (allUserIds.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    const mentionValues = allUserIds.map((userId) => ({
      id: nanoid(),
      recordId,
      mentionedUserId: userId,
      mentionedById,
      createdAt: now,
    }));

    await database.insert(mentions).values(mentionValues);
  }
}

/**
 * Extract user mentions from Tiptap JSON content.
 * Looks for userMention or mention nodes with id attributes.
 */
function extractMentionsFromContent(
  jsonStr: string,
): Array<{ userId: string; displayName: string }> {
  const seen = new Set<string>();
  const results: Array<{ userId: string; displayName: string }> = [];

  try {
    const doc = JSON.parse(jsonStr) as Record<string, unknown>;

    function traverse(node: Record<string, unknown>): void {
      if (
        (node.type === "userMention" || node.type === "mention") &&
        node.attrs &&
        typeof node.attrs === "object" &&
        "id" in node.attrs
      ) {
        const userId = String(node.attrs.id);
        if (!seen.has(userId)) {
          seen.add(userId);
          results.push({
            userId,
            displayName: String((node.attrs as Record<string, unknown>).label ?? ""),
          });
        }
      }

      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          if (typeof child === "object" && child !== null) {
            traverse(child as Record<string, unknown>);
          }
        }
      }
    }

    traverse(doc);
  } catch {
    // Silently ignore JSON parse errors
  }

  return results;
}

export type MentionWithProfile = {
  mentionId: string;
  userId: string;
  displayName: string | null;
  slug: string | null;
  profilePhotoUrl: string | null;
};

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
  const { records } = await import("../../schema.server");
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
    .where(
      and(
        eq(mentions.mentionedUserId, userId),
        sql`${records.visibility} IN ('cohort', 'public')`,
      ),
    )
    .limit(limit);
}
