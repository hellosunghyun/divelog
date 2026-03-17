import { nanoid } from "../../../../lib/utils/utils.server";
import { db } from "../../../client.server";
import { auditLogs } from "../../../schema.server";

export interface AuditLogParams {
  actorId: string;
  targetType: string;
  targetId: string;
  action: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

export async function createAuditLog(d1: D1Database, params: AuditLogParams): Promise<void> {
  try {
    const database = db(d1);
    await database.insert(auditLogs).values({
      id: nanoid(),
      actorId: params.actorId,
      targetType: params.targetType,
      targetId: params.targetId,
      action: params.action,
      beforeState: params.beforeState != null ? JSON.stringify(params.beforeState) : null,
      afterState: params.afterState != null ? JSON.stringify(params.afterState) : null,
      createdAt: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    console.error("[audit] Failed to create audit log:", err);
  }
}
