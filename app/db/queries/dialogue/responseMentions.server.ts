import { eq } from "drizzle-orm";

import { db } from "../../client.server";
import { responseMentions } from "../../schema.server";
import { extractUserMentions } from "../../../lib/content/extract-references.server";
import { nanoid } from "../../../lib/utils/utils.server";

export async function syncMentionsForResponse(
  d1: D1Database,
  responseId: string,
  recordId: string,
  content: string,
  mentionedById: string,
): Promise<void> {
  const database = db(d1);

  let mentionedUserIds: string[] = [];
  try {
    const extracted = extractUserMentions(content);
    mentionedUserIds = [...new Set(extracted.map((mention) => mention.userId))];
  } catch {
    mentionedUserIds = [];
  }

  await database.delete(responseMentions).where(eq(responseMentions.responseId, responseId));

  if (mentionedUserIds.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  await database.insert(responseMentions).values(
    mentionedUserIds.map((userId) => ({
      id: nanoid(),
      responseId,
      recordId,
      mentionedUserId: userId,
      mentionedById,
      createdAt: now,
    })),
  );
}

export async function deleteMentionsForResponse(
  d1: D1Database,
  responseId: string,
): Promise<void> {
  const database = db(d1);
  await database.delete(responseMentions).where(eq(responseMentions.responseId, responseId));
}
