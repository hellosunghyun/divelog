import { sql } from "drizzle-orm";
import { type AnySQLiteColumn, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => sql`(unixepoch())`;

export const learnerProfiles = sqliteTable("learner_profiles", {
  userId: text("user_id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  profilePhotoUrl: text("profile_photo_url"),
  cohort: text("cohort"),
  bio: text("bio"),
  currentStageId: text("current_stage_id").references(() => stages.id),
  currentQuestion: text("current_question"),
  notificationEmailEnabled: integer("notification_email_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  defaultVisibility: text("default_visibility").notNull().default("public"),
  defaultResponsePreference: text("default_response_preference").notNull().default("open"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const stages = sqliteTable("stages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(),
  status: text("status").notNull().default("upcoming"),
  description: text("description"),
  accentTone: text("accent_tone"),
  order: integer("order").notNull().default(0),
  startDate: integer("start_date"),
  endDate: integer("end_date"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  heroContent: text("hero_content"),
  cohort: text("cohort"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  problemDefinition: text("problem_definition"),
  currentQuestion: text("current_question"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  cohort: text("cohort"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});



export const collaborationUnits = sqliteTable("collaboration_units", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  challengeId: text("challenge_id").references(() => challenges.id),
  status: text("status").notNull().default("forming"),
  currentQuestion: text("current_question"),
  description: text("description"),
  cohort: text("cohort"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const collaborationMembers = sqliteTable(
  "collaboration_members",
  {
    unitId: text("unit_id")
      .notNull()
      .references(() => collaborationUnits.id, { onDelete: "cascade" }),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: integer("joined_at").notNull().default(now()),
  },
  (table) => [primaryKey({ columns: [table.unitId, table.learnerId] })],
);

export const records = sqliteTable("records", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  authorId: text("author_id")
    .notNull()
    .references(() => learnerProfiles.userId),
  challengeId: text("challenge_id").references(() => challenges.id),
  collaborationUnitId: text("collaboration_unit_id").references(() => collaborationUnits.id),
  linkedRecordId: text("linked_record_id"),
  originalUrl: text("original_url"),
  originalTitle: text("original_title"),
  originalDescription: text("original_description"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentText: text("content_text").default(""),
  format: text("format").notNull().default("note"),
  type: text("type").notNull().default("exploration"),
  rhythm: text("rhythm").notNull().default("free"),
  visibility: text("visibility").notNull().default("public"),
  responsePreference: text("response_preference").notNull().default("open"),
  searchIndexingOptOut: integer("search_indexing_opt_out", { mode: "boolean" }).notNull().default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  moderationStatus: text("moderation_status").notNull().default("clean"),
  moderationNote: text("moderation_note"),
  cohort: text("cohort"),
  recordedAt: integer("recorded_at"),
  recordedEndAt: integer("recorded_end_at"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  direction: text("direction").notNull().default("outward"),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").default(now()),
  closedAt: integer("closed_at"),
});

export const selfAnswers = sqliteTable("self_answers", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => learnerProfiles.userId),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  questionId: text("question_id").references(() => questions.id),
  authorId: text("author_id")
    .notNull()
    .references(() => learnerProfiles.userId),
  parentResponseId: text("parent_response_id").references((): AnySQLiteColumn => responses.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  visibility: text("visibility").notNull().default("public"),
  moderationStatus: text("moderation_status").notNull().default("clean"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const sentences = sqliteTable("sentences", {
  id: text("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  savedById: text("saved_by_id")
    .notNull()
    .references(() => learnerProfiles.userId),
  content: text("content").notNull(),
  reason: text("reason"),
  paragraphIndex: integer("paragraph_index"),
  createdAt: integer("created_at").notNull().default(now()),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id")
    .notNull()
    .references(() => learnerProfiles.userId),
  actorId: text("actor_id").references(() => learnerProfiles.userId),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  recordId: text("record_id").references(() => records.id),
  questionId: text("question_id").references(() => questions.id),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now()),
}, (table) => [
  index("idx_notifications_recipient_read_created_at").on(
    table.recipientId,
    table.isRead,
    table.createdAt,
  ),
]);

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    type: text("type").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updated_at"),
  },
  (table) => [
    uniqueIndex("idx_notification_preferences_learner_type").on(table.learnerId, table.type),
  ],
);



export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  promptBody: text("prompt_body"),
  context: text("context"),
  form: text("form"),
  rhythm: text("rhythm"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const curationSlots = sqliteTable("curation_slots", {
  id: text("id").primaryKey(),
  slotType: text("slot_type").notNull(),
  targetId: text("target_id").notNull(),
  targetType: text("target_type").notNull(),
  position: integer("position").notNull().default(0),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action").notNull(),
  beforeState: text("before_state"),
  afterState: text("after_state"),
  createdAt: integer("created_at").notNull().default(now()),
});

export const recordRevisions = sqliteTable("record_revisions", {
  id: text("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => learnerProfiles.userId),
  revisionNumber: integer("revision_number").notNull(),
  snapshot: text("snapshot").notNull(),
  changedFields: text("changed_fields").notNull(),
  tagsSnapshot: text("tags_snapshot"),
  createdAt: integer("created_at").notNull().default(now()),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  grantedAt: integer("granted_at").notNull().default(now()),
  grantedBy: text("granted_by"),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  color: text("color").default("#6E6E73"),
  createdBy: text("created_by"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const recordTags = sqliteTable(
  "record_tags",
  {
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now()),
  },
  (table) => [primaryKey({ columns: [table.recordId, table.tagId] })],
);

export const mentions = sqliteTable("mentions", {
  id: text("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  mentionedUserId: text("mentioned_user_id")
    .notNull()
    .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
  mentionedById: text("mentioned_by_id")
    .notNull()
    .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull().default(now()),
});

export const responseMentions = sqliteTable(
  "response_mentions",
  {
    id: text("id").primaryKey(),
    responseId: text("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    mentionedUserId: text("mentioned_user_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    mentionedById: text("mentioned_by_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

export const responseRecordRefs = sqliteTable(
  "response_record_refs",
  {
    id: text("id").primaryKey(),
    responseId: text("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    referencedRecordId: text("referenced_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

export const recordLinks = sqliteTable(
  "record_links",
  {
    id: text("id").primaryKey(),
    sourceRecordId: text("source_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    targetRecordId: text("target_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    linkType: text("link_type").notNull().default("reference"),
    quotedText: text("quoted_text"),
    createdAt: integer("created_at").notNull().default(now()),
  },
);

export const recordReferences = sqliteTable("record_references", {
  id: text("id").primaryKey(),
  recordId: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull().default(now()),
});

export const drafts = sqliteTable(
  "drafts",
  {
    id: text("id").primaryKey().notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => learnerProfiles.userId),
    format: text("format").notNull(),
    title: text("title"),
    content: text("content").notNull().default(""),
    contentJson: text("content_json"),
    challengeId: text("challenge_id").references(() => challenges.id),
    rhythm: text("rhythm").notNull().default("free"),
    visibility: text("visibility").notNull().default("public"),
    responsePreference: text("response_preference").notNull().default("open"),
    createdAt: integer("created_at").notNull().default(now()),
    updatedAt: integer("updated_at").notNull().default(now()),
  },
  (table) => [uniqueIndex("idx_drafts_author_format").on(table.authorId, table.format)],
);

export const questionReminders = sqliteTable(
  "question_reminders",
  {
    id: text("id").primaryKey().notNull(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    remindAt: integer("remind_at").notNull(),
    sentAt: integer("sent_at"),
    createdAt: integer("created_at").notNull().default(now()),
  },
  (table) => [index("idx_reminders_learner").on(table.learnerId, table.sentAt)],
);



export const savedRecords = sqliteTable(
  "saved_records",
  {
    learnerId: text("learner_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    savedAt: integer("saved_at").notNull().default(now()),
  },
  (table) => [primaryKey({ columns: [table.learnerId, table.recordId] })],
);

export const recordReads = sqliteTable(
  "record_reads",
  {
    learnerId: text("learner_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    readAt: integer("read_at").notNull().default(now()),
  },
  (table) => [primaryKey({ columns: [table.learnerId, table.recordId] })],
);

export const recordParticipants = sqliteTable(
  "record_participants",
  {
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    participantUserId: text("participant_user_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    addedById: text("added_by_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    role: text("role").notNull().default("companion"),
    createdAt: integer("created_at").notNull().default(now()),
  },
  (table) => [primaryKey({ columns: [table.recordId, table.participantUserId] })],
);
