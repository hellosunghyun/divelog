import { asc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { stages } from "../../../schema.server";

export async function adminGetAllStages(d1: D1Database) {
  return db(d1).select().from(stages).orderBy(asc(stages.order));
}

export async function adminGetStageById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(stages).where(eq(stages.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateStage(
  d1: D1Database,
  id: string,
  data: Partial<typeof stages.$inferInsert>,
) {
  return db(d1)
    .update(stages)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(stages.id, id));
}
