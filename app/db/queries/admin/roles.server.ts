import { and, desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { userRoles } from "../../schema.server";
import { ADMIN_ROLES, type AdminRole } from "./roles";
import { nanoid } from "~/lib/utils/utils.server";

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

export async function adminGetUserRoles(d1: D1Database, userId: string) {
  return db(d1).select().from(userRoles).where(eq(userRoles.userId, userId)).orderBy(desc(userRoles.grantedAt));
}

export async function adminAddUserRole(
  d1: D1Database,
  userId: string,
  role: AdminRole,
  grantedBy: string | null = null,
) {
  const existing = await db(d1)
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db(d1)
    .insert(userRoles)
    .values({
      id: nanoid(),
      userId,
      role,
      grantedAt: Math.floor(Date.now() / 1000),
      grantedBy,
    })
    .returning();

  return result[0];
}

export async function adminRemoveUserRole(d1: D1Database, userId: string, role: AdminRole) {
  return db(d1).delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));
}
