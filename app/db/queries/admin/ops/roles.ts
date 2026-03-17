export const ADMIN_ROLES = ["admin", "operator", "curator", "moderator", "mentor_viewer", "analytics_viewer"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
