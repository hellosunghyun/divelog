import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  originalUrl: text("original_url"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentText: text("content_text").default(""),
  format: text("format").notNull().default("note"),
  type: text("type").notNull().default("personal"),
  rhythm: text("rhythm").notNull().default("free"),
  visibility: text("visibility").notNull().default("public"),
  responsePreference: text("response_preference").notNull().default("open"),
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
  parentResponseId: text("parent_response_id").references(() => responses.id),
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
    stageId: text("stage_id").references(() => stages.id),
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

export const questionCarryOvers = sqliteTable("question_carry_overs", {
  id: text("id").primaryKey().notNull(),
  originalQuestionId: text("original_question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  newQuestionId: text("new_question_id").references(() => questions.id, { onDelete: "set null" }),
  fromStageId: text("from_stage_id")
    .notNull()
    .references(() => stages.id),
  toStageId: text("to_stage_id")
    .notNull()
    .references(() => stages.id),
  carriedAt: integer("carried_at").notNull().default(now()),
});

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

export const personalStageReflections = sqliteTable(
  "personal_stage_reflections",
  {
    id: text("id").primaryKey().notNull(),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learnerProfiles.userId, { onDelete: "cascade" }),
    letGo: text("let_go"),
    carryQuestion: text("carry_question"),
    lastingSentence: text("lasting_sentence"),
    createdAt: integer("created_at").notNull().default(now()),
    updatedAt: integer("updated_at").notNull().default(now()),
  },
  (table) => [uniqueIndex("idx_reflections_stage_learner").on(table.stageId, table.learnerId)],
);
