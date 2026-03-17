import { desc, eq } from "drizzle-orm";

import { db } from "../../../client.server";
import { settings } from "../../../schema.server";

export async function adminGetSettings(d1: D1Database) {
  return db(d1).select().from(settings).orderBy(desc(settings.updatedAt));
}

export async function adminGetSettingById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(settings).where(eq(settings.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateSetting(
  d1: D1Database,
  id: string,
  data: Partial<typeof settings.$inferInsert>,
) {
  return db(d1)
    .update(settings)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(settings.id, id));
}
