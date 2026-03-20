import {
  getDueReminders,
  markReminderSent,
} from "~/db/queries/misc/reminders.server";

import { createModuleLogger } from "../infra/logger.server";
import { notify } from "./notify.server";

type ReminderNotificationType = "reminder" | "reread_reminder";

const DEFAULT_TITLES: Record<ReminderNotificationType, string> = {
  reminder: "자기답변을 남겨보세요",
  reread_reminder: "다시 읽어보세요",
};

interface DeliverReminderNotificationParams {
  d1: D1Database;
  recipientId: string;
  type: ReminderNotificationType;
  questionId?: string;
  recordId?: string;
  title?: string;
  content?: string;
  visibility?: string;
}

interface DeliverRereadReminderNotificationParams {
  d1: D1Database;
  recipientId: string;
  recordId: string;
  title?: string;
  content?: string;
  visibility?: string;
}

const logger = createModuleLogger("notifications.reminder-delivery");

export async function deliverReminderNotification(
  params: DeliverReminderNotificationParams,
): Promise<boolean> {
  try {
    const result = await notify({
      d1: params.d1,
      actorId: null,
      recipientId: params.recipientId,
      type: params.type,
      title: params.title ?? DEFAULT_TITLES[params.type],
      ...(params.content !== undefined ? { content: params.content } : {}),
      ...(params.questionId !== undefined ? { questionId: params.questionId } : {}),
      ...(params.recordId !== undefined ? { recordId: params.recordId } : {}),
      ...(params.visibility !== undefined ? { visibility: params.visibility } : {}),
    });

    if (!result.success) {
      logger.warn("reminder_notification_failed", {
        recipientId: params.recipientId,
        type: params.type,
        recordId: params.recordId ?? null,
        questionId: params.questionId ?? null,
        error: result.error ?? "알림 생성에 실패했습니다.",
      });
    }

    return result.success;
  } catch (error) {
    logger.warn("reminder_notification_failed", {
      recipientId: params.recipientId,
      type: params.type,
      recordId: params.recordId ?? null,
      questionId: params.questionId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}

export async function deliverDueQuestionReminders(params: {
  d1: D1Database;
  learnerId: string;
}): Promise<number> {
  const reminders = await getDueReminders(params.d1, params.learnerId);
  let deliveredCount = 0;

  for (const reminder of reminders) {
    const delivered = await deliverReminderNotification({
      d1: params.d1,
      recipientId: reminder.learnerId,
      type: "reminder",
      questionId: reminder.questionId,
    });

    if (!delivered) {
      continue;
    }

    try {
      await markReminderSent(params.d1, reminder.id);
      deliveredCount += 1;
    } catch (error) {
      logger.warn("reminder_mark_sent_failed", {
        reminderId: reminder.id,
        recipientId: reminder.learnerId,
        questionId: reminder.questionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return deliveredCount;
}

export async function deliverRereadReminderNotification(
  params: DeliverRereadReminderNotificationParams,
): Promise<boolean> {
  return deliverReminderNotification({
    d1: params.d1,
    recipientId: params.recipientId,
    type: "reread_reminder",
    recordId: params.recordId,
    ...(params.title !== undefined ? { title: params.title } : {}),
    ...(params.content !== undefined ? { content: params.content } : {}),
    ...(params.visibility !== undefined ? { visibility: params.visibility } : {}),
  });
}
