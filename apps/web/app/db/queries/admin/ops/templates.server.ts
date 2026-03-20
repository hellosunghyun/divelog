import { desc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { templates } from "../../../schema.server";

export async function adminGetTemplates(d1: D1Database) {
  return db(d1).select().from(templates).orderBy(desc(templates.updatedAt));
}

export async function adminGetTemplateById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(templates).where(eq(templates.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateTemplate(
  d1: D1Database,
  id: string,
  data: Partial<typeof templates.$inferInsert>,
) {
  return db(d1)
    .update(templates)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(templates.id, id));
}
