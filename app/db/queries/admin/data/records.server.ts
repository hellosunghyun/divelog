import { desc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { records } from "../../../schema.server";

export async function adminGetRecords(d1: D1Database) {
  return db(d1).select().from(records).orderBy(desc(records.createdAt));
}

export async function adminGetRecordById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(records).where(eq(records.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateRecord(
  d1: D1Database,
  id: string,
  data: Partial<typeof records.$inferInsert>,
) {
  return db(d1)
    .update(records)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(records.id, id));
}
