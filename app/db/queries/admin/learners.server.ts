import { asc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { learnerProfiles } from "../../schema.server";

export async function adminGetLearners(d1: D1Database) {
  return db(d1).select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName));
}

export async function adminGetLearnerByUserId(d1: D1Database, userId: string) {
  const result = await db(d1)
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function adminUpdateLearner(
  d1: D1Database,
  userId: string,
  data: Partial<typeof learnerProfiles.$inferInsert>,
) {
  return db(d1)
    .update(learnerProfiles)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(learnerProfiles.userId, userId));
}
