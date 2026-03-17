import { nanoid } from "~/lib/utils/utils.server";
import { db } from "~/db/client.server";
import { auditLogs } from "~/db/schema.server";

export interface AuditLogParams {
  actorId: string;
  targetType: string; // "record" | "response" | "question" | "stage" | ...
  targetId: string;
  action: string; // "create" | "update" | "delete" | "publish" | ...
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

export async function createAuditLog(d1: D1Database, params: AuditLogParams): Promise<string> {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  const beforeStateStr = params.beforeState ? JSON.stringify(params.beforeState) : null;
  const afterStateStr = params.afterState ? JSON.stringify(params.afterState) : null;

  await database.insert(auditLogs).values({
    id,
    actorId: params.actorId,
    targetType: params.targetType,
    targetId: params.targetId,
    action: params.action,
    beforeState: beforeStateStr,
    afterState: afterStateStr,
    createdAt: now,
  });

  return id;
}
