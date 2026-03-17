import { desc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { collectiveMemories } from "../../../schema.server";

export async function adminGetMemories(d1: D1Database) {
  return db(d1).select().from(collectiveMemories).orderBy(desc(collectiveMemories.updatedAt));
}

export async function adminGetMemoryById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(collectiveMemories).where(eq(collectiveMemories.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateMemory(
  d1: D1Database,
  id: string,
  data: Partial<typeof collectiveMemories.$inferInsert>,
) {
  return db(d1)
    .update(collectiveMemories)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(collectiveMemories.id, id));
}
