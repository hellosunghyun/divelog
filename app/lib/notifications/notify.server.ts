import { getNotificationPreferences, type NotificationType } from "../../db/queries/social/notificationPreferences.server";
import {
  createNotification,
} from "../../db/queries/social/notifications.server";
import { db } from "../../db/client.server";
import { notifications } from "../../db/schema.server";
import { and, eq } from "drizzle-orm";
import { createModuleLogger } from "../infra/logger.server";

export interface NotifyParams {
  d1: D1Database;
  actorId: string | null | undefined;
  recipientId: string;
  type: NotificationType;
  title: string;
  content?: string;
  recordId?: string;
  questionId?: string;
  visibility?: string;
}

const logger = createModuleLogger("notifications.notify");
const dedupeCache = new Set<string>();
const CREATE_NOTIFICATION_TYPES = [
  "response",
  "reply",
  "mention",
  "participant_added",
  "reminder",
  "reread_reminder",
  "stage_transition",
] as const;
type CreatableNotificationType = (typeof CREATE_NOTIFICATION_TYPES)[number];

function isCreateNotificationType(type: NotificationType): type is CreatableNotificationType {
  return (CREATE_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

function getDedupeKey(recipientId: string, type: NotificationType, recordId: string): string {
  return `${recipientId}:${type}:${recordId}`;
}

async function hasExistingNotification(
  d1: D1Database,
  recipientId: string,
  type: NotificationType,
  recordId: string,
): Promise<boolean | null> {
  try {
    if (!isCreateNotificationType(type)) {
      return false;
    }

    const database = db(d1);
    const rows = await database
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.type, type),
          eq(notifications.recordId, recordId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  } catch {
    return null;
  }
}

export async function notify(params: NotifyParams): Promise<{ success: boolean; error?: string }> {
  try {
    const notificationType = params.type;

    if (params.actorId != null && params.actorId === params.recipientId) {
      return { success: true };
    }

    if (params.visibility === "draft") {
      return { success: true };
    }

    const preferences = await getNotificationPreferences(params.d1, params.recipientId);
    if (preferences[notificationType] === false) {
      return { success: true };
    }

    if (params.recordId) {
      const exists = await hasExistingNotification(
        params.d1,
        params.recipientId,
        notificationType,
        params.recordId,
      );

      if (exists) {
        return { success: true };
      }

      if (exists === null) {
        const dedupeKey = `${getDedupeKey(params.recipientId, notificationType, params.recordId)}:${params.visibility ?? ""}`;
        if (dedupeCache.has(dedupeKey)) {
          return { success: true };
        }
      }
    }

    if (!isCreateNotificationType(notificationType)) {
      throw new Error(`지원하지 않는 알림 타입입니다: ${notificationType}`);
    }

    await createNotification(params.d1, {
      recipientId: params.recipientId,
      actorId: params.actorId ?? null,
      type: notificationType,
      title: params.title,
      ...(params.content !== undefined ? { content: params.content } : {}),
      ...(params.recordId !== undefined ? { recordId: params.recordId } : {}),
      ...(params.questionId !== undefined ? { questionId: params.questionId } : {}),
    });

    if (params.recordId) {
      const dedupeKey = `${getDedupeKey(params.recipientId, notificationType, params.recordId)}:${params.visibility ?? ""}`;
      dedupeCache.add(dedupeKey);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "알림 생성 중 오류가 발생했습니다.";

    logger.error("알림 생성 실패", {
      actorId: params.actorId ?? null,
      recipientId: params.recipientId,
      type: params.type,
      recordId: params.recordId ?? null,
      questionId: params.questionId ?? null,
      error: message,
    });

    return {
      success: false,
      error: message,
    };
  }
}
