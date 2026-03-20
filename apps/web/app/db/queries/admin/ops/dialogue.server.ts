import { desc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { responses } from "../../../schema.server";

export async function adminGetDialogue(d1: D1Database) {
  return db(d1).select().from(responses).orderBy(desc(responses.createdAt));
}

export async function adminGetDialogueById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(responses).where(eq(responses.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateDialogue(
  d1: D1Database,
  id: string,
  data: Partial<typeof responses.$inferInsert>,
) {
  return db(d1)
    .update(responses)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(responses.id, id));
}
