import { and, desc, eq } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { notifications } from "../../schema.server";

export type NotificationType =
  | "response"
  | "mention"
  | "participant_added"
  | "reminder"
  | "reread_reminder";

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  content?: string;
  recordId?: string;
  questionId?: string;
}

export async function getNotifications(d1: D1Database, recipientId: string, unreadOnly = false) {
  const database = db(d1);
  const conditions = [eq(notifications.recipientId, recipientId)];

  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  return database
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markAsRead(d1: D1Database, notificationId: string, recipientId: string) {
  const database = db(d1);

  return database
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, recipientId)));
}

export async function markAllAsRead(d1: D1Database, recipientId: string) {
  const database = db(d1);

  return database
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.recipientId, recipientId));
}

export async function getUnreadCount(d1: D1Database, recipientId: string) {
  const database = db(d1);
  const result = await database
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)));

  return result.length;
}

export async function createNotification(
  d1: D1Database,
  input: CreateNotificationInput
) {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  const result = await database
    .insert(notifications)
    .values({
      id: nanoid(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      content: input.content,
      recordId: input.recordId,
      questionId: input.questionId,
      isRead: false,
      createdAt: now,
    })
    .returning();

  return result[0];
}

export async function bulkCreateNotifications(
  d1: D1Database,
  inputs: CreateNotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  await database.insert(notifications).values(
    inputs.map((input) => ({
      id: nanoid(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      content: input.content,
      recordId: input.recordId,
      questionId: input.questionId,
      isRead: false,
      createdAt: now,
    }))
  );
}
