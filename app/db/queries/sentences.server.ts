import { desc, eq } from "drizzle-orm";

import type { SaveSentenceInput } from "../../lib/validation";
import { nanoid } from "../../lib/utils.server";
import { db } from "../client.server";
import { learnerProfiles, sentences } from "../schema.server";

export async function getSentencesByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);

  return database
    .select({
      sentence: sentences,
      savedBy: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
      },
    })
    .from(sentences)
    .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
    .where(eq(sentences.recordId, recordId));
}

export async function saveSentence(d1: D1Database, savedById: string, data: SaveSentenceInput) {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(sentences).values({
    id,
    recordId: data.recordId,
    savedById,
    content: data.content,
    reason: data.reason ?? null,
    paragraphIndex: data.paragraphIndex ?? null,
    createdAt: now,
  });

  return id;
}

export async function getSentencesByUser(d1: D1Database, userId: string) {
  const database = db(d1);

  return database
    .select()
    .from(sentences)
    .where(eq(sentences.savedById, userId))
    .orderBy(desc(sentences.createdAt));
}
