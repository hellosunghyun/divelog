import { and, eq, inArray } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { notificationPreferences } from "../../schema.server";

/**
 * All notification types that can have user preferences.
 * Must match the types created in notifications.server.ts
 */
export const NOTIFICATION_TYPES = [
  "response",
  "reply",
  "mention",
  "participant_added",
  "reminder",
  "reread_reminder",
  "stage_transition",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Get notification preferences for a learner.
 * Returns a map of { [type]: enabled } where missing types default to true (enabled).
 */
export async function getNotificationPreferences(
  d1: D1Database,
  learnerId: string
): Promise<Record<NotificationType, boolean>> {
  const database = db(d1);

  const rows = await database
    .select({
      type: notificationPreferences.type,
      enabled: notificationPreferences.enabled,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.learnerId, learnerId));

  // Build result map with defaults
  const result: Record<NotificationType, boolean> = {} as Record<
    NotificationType,
    boolean
  >;

  // Initialize all types as enabled (default)
  for (const type of NOTIFICATION_TYPES) {
    result[type] = true;
  }

  // Override with stored preferences
  for (const row of rows) {
    if (NOTIFICATION_TYPES.includes(row.type as NotificationType)) {
      result[row.type as NotificationType] = row.enabled;
    }
  }

  return result;
}

/**
 * Update notification preferences for a learner.
 * Uses upsert (insert or replace) to handle new and existing preferences.
 */
export async function upsertNotificationPreferences(
  d1: D1Database,
  learnerId: string,
  preferences: Partial<Record<NotificationType, boolean>>
): Promise<void> {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  for (const [type, enabled] of Object.entries(preferences)) {
    await database
      .insert(notificationPreferences)
      .values({
        id: nanoid(),
        learnerId,
        type,
        enabled,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.learnerId, notificationPreferences.type],
        set: {
          enabled,
          updatedAt: now,
        },
      });
  }
}

/**
 * Check if a specific notification type is enabled for a learner.
 */
export async function isNotificationTypeEnabled(
  d1: D1Database,
  learnerId: string,
  type: NotificationType
): Promise<boolean> {
  const database = db(d1);

  const result = await database
    .select({ enabled: notificationPreferences.enabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.learnerId, learnerId),
        eq(notificationPreferences.type, type)
      )
    )
    .limit(1);

  // Default to true (enabled) if no preference found
  return result.length === 0 ? true : result[0].enabled;
}

/**
 * Reset all preferences for a learner to defaults (all enabled).
 */
export async function resetNotificationPreferences(
  d1: D1Database,
  learnerId: string
): Promise<void> {
  const database = db(d1);

  await database
    .delete(notificationPreferences)
    .where(eq(notificationPreferences.learnerId, learnerId));
}
