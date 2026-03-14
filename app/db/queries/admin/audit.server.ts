import { desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { auditLogs } from "../../schema.server";

export async function adminGetAuditLogs(d1: D1Database) {
  return db(d1).select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
}

export async function adminGetAuditLogById(d1: D1Database, id: string) {
  const result = await db(d1).select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);

  return result[0] ?? null;
}

export async function adminUpdateAuditLog(
  d1: D1Database,
  id: string,
  data: Partial<typeof auditLogs.$inferInsert>,
) {
  return db(d1).update(auditLogs).set(data).where(eq(auditLogs.id, id));
}
