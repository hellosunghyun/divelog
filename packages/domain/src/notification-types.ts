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
