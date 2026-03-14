import { desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { challenges } from "../../schema.server";

export async function adminGetChallenges(d1: D1Database) {
  return db(d1).select().from(challenges).orderBy(desc(challenges.createdAt));
}

export async function adminGetChallengeById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(challenges).where(eq(challenges.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateChallenge(
  d1: D1Database,
  id: string,
  data: Partial<typeof challenges.$inferInsert>,
) {
  return db(d1)
    .update(challenges)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(challenges.id, id));
}
