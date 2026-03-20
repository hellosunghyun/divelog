import { desc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { curationSlots } from "../../../schema.server";

export async function adminGetCurationSlots(d1: D1Database) {
  return db(d1).select().from(curationSlots).orderBy(desc(curationSlots.updatedAt));
}

export async function adminGetCurationSlotById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(curationSlots).where(eq(curationSlots.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateCurationSlot(
  d1: D1Database,
  id: string,
  data: Partial<typeof curationSlots.$inferInsert>,
) {
  return db(d1)
    .update(curationSlots)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(curationSlots.id, id));
}
