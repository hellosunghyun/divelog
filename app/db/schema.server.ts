import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = () => sql`(unixepoch())`;

export const learnerProfiles = sqliteTable("learner_profiles", {
  userId: text("user_id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  cohort: text("cohort"),
  bio: text("bio"),
  currentStageId: text("current_stage_id").references(() => stages.id),
  currentQuestion: text("current_question"),
  notificationEmailEnabled: integer("notification_email_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  defaultVisibility: text("default_visibility").notNull().default("cohort"),
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

export const challengeStages = sqliteTable(
  "challenge_stages",
  {
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.challengeId, table.stageId] })],
);

export const collaborationUnits = sqliteTable("collaboration_units", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  challengeId: text("challenge_id").references(() => challenges.id),
  stageId: text("stage_id").references(() => stages.id),
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
  stageId: text("stage_id").references(() => stages.id),
  challengeId: text("challenge_id").references(() => challenges.id),
  collaborationUnitId: text("collaboration_unit_id").references(() => collaborationUnits.id),
  linkedRecordId: text("linked_record_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentText: text("content_text").default(""),
  format: text("format").notNull().default("note"),
  type: text("type").notNull().default("personal"),
  rhythm: text("rhythm").notNull().default("free"),
  visibility: text("visibility").notNull().default("cohort"),
  responsePreference: text("response_preference").notNull().default("open"),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  moderationStatus: text("moderation_status").notNull().default("clean"),
  moderationNote: text("moderation_note"),
  cohort: text("cohort"),
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
  type: text("type").notNull(),
  content: text("content").notNull(),
  visibility: text("visibility").notNull().default("cohort"),
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
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  recordId: text("record_id").references(() => records.id),
  questionId: text("question_id").references(() => questions.id),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now()),
});

export const collectiveMemories = sqliteTable("collective_memories", {
  id: text("id").primaryKey(),
  stageId: text("stage_id")
    .notNull()
    .references(() => stages.id),
  summary: text("summary"),
  carryForwardQuestion: text("carry_forward_question"),
  status: text("status").notNull().default("draft"),
  cohort: text("cohort"),
  createdAt: integer("created_at").notNull().default(now()),
  updatedAt: integer("updated_at").notNull().default(now()),
});

export const memoryQuestions = sqliteTable(
  "memory_questions",
  {
    memoryId: text("memory_id")
      .notNull()
      .references(() => collectiveMemories.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.questionId] })],
);

export const memorySentences = sqliteTable(
  "memory_sentences",
  {
    memoryId: text("memory_id")
      .notNull()
      .references(() => collectiveMemories.id, { onDelete: "cascade" }),
    sentenceId: text("sentence_id")
      .notNull()
      .references(() => sentences.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.sentenceId] })],
);

export const memoryRecords = sqliteTable(
  "memory_records",
  {
    memoryId: text("memory_id")
      .notNull()
      .references(() => collectiveMemories.id, { onDelete: "cascade" }),
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.recordId] })],
);

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  promptBody: text("prompt_body"),
  context: text("context"),
  form: text("form"),
  rhythm: text("rhythm"),
  stageKind: text("stage_kind"),
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
