import { and, desc, eq } from "drizzle-orm";

import { db } from "../client.server";
import { notifications } from "../schema.server";

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
