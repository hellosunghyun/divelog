import { desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { collaborationUnits } from "../../schema.server";

export async function adminGetCollaborationUnits(d1: D1Database) {
  return db(d1).select().from(collaborationUnits).orderBy(desc(collaborationUnits.createdAt));
}

export async function adminGetCollaborationUnitById(d1: D1Database, id: string) {
  const result = await db(d1)
    .select()
    .from(collaborationUnits)
    .where(eq(collaborationUnits.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function adminUpdateCollaborationUnit(
  d1: D1Database,
  id: string,
  data: Partial<typeof collaborationUnits.$inferInsert>,
) {
  return db(d1)
    .update(collaborationUnits)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(collaborationUnits.id, id));
}
