import { desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { userRoles } from "../../schema.server";

export async function adminGetRoles(d1: D1Database) {
  return db(d1).select().from(userRoles).orderBy(desc(userRoles.grantedAt));
}

export async function adminGetRoleById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(userRoles).where(eq(userRoles.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateRole(d1: D1Database, id: string, data: Partial<typeof userRoles.$inferInsert>) {
  return db(d1).update(userRoles).set(data).where(eq(userRoles.id, id));
}
