import { relations } from "drizzle-orm";
import {
  auditLogs,
  challenges,
  collaborationMembers,
  collaborationUnits,
  curationSlots,
  drafts,
  learnerProfiles,
  notifications,
  questionReminders,
  questions,
  recordParticipants,
  recordReads,
  recordReferences,
  recordRevisions,
  recordTags,
  records,
  responses,
  savedRecords,
  selfAnswers,
  sentences,
  settings,
  stages,
  tags,
  templates,
  userRoles,
} from "./schema.server";

export const learnerProfilesRelations = relations(learnerProfiles, ({ many, one }) => ({
  currentStage: one(stages, {
    fields: [learnerProfiles.currentStageId],
    references: [stages.id],
  }),
  records: many(records),
  responses: many(responses),
  sentences: many(sentences),
  notifications: many(notifications),
  collaborationMembers: many(collaborationMembers),
  selfAnswers: many(selfAnswers),
  drafts: many(drafts),
  questionReminders: many(questionReminders),
  savedRecords: many(savedRecords),
  recordReads: many(recordReads),
  recordParticipantsAsParticipant: many(recordParticipants, { relationName: "participant" }),
  recordParticipantsAsAddedBy: many(recordParticipants, { relationName: "added_by" }),
}));

export const stagesRelations = relations(stages, ({ many }) => ({
  learnersAtStage: many(learnerProfiles),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  collaborationUnits: many(collaborationUnits),
  records: many(records),
  drafts: many(drafts),
}));

export const collaborationUnitsRelations = relations(collaborationUnits, ({ many, one }) => ({
  members: many(collaborationMembers),
  records: many(records),
  challenge: one(challenges, {
    fields: [collaborationUnits.challengeId],
    references: [challenges.id],
  }),
}));

export const collaborationMembersRelations = relations(collaborationMembers, ({ one }) => ({
  unit: one(collaborationUnits, {
    fields: [collaborationMembers.unitId],
    references: [collaborationUnits.id],
  }),
  learner: one(learnerProfiles, {
    fields: [collaborationMembers.learnerId],
    references: [learnerProfiles.userId],
  }),
}));

export const recordsRelations = relations(records, ({ many, one }) => ({
  author: one(learnerProfiles, {
    fields: [records.authorId],
    references: [learnerProfiles.userId],
  }),
  challenge: one(challenges, {
    fields: [records.challengeId],
    references: [challenges.id],
  }),
  collaborationUnit: one(collaborationUnits, {
    fields: [records.collaborationUnitId],
    references: [collaborationUnits.id],
  }),
  questions: many(questions),
  responses: many(responses),
  sentences: many(sentences),
  recordTags: many(recordTags),
  savedRecords: many(savedRecords),
  revisions: many(recordRevisions),
  reads: many(recordReads),
  participants: many(recordParticipants),
  references: many(recordReferences),
}));

export const recordRevisionsRelations = relations(recordRevisions, ({ one }) => ({
  record: one(records, {
    fields: [recordRevisions.recordId],
    references: [records.id],
  }),
  author: one(learnerProfiles, {
    fields: [recordRevisions.authorId],
    references: [learnerProfiles.userId],
  }),
}));

export const questionsRelations = relations(questions, ({ many, one }) => ({
  record: one(records, {
    fields: [questions.recordId],
    references: [records.id],
  }),
  responses: many(responses),
  selfAnswers: many(selfAnswers),
  reminders: many(questionReminders),
}));

export const selfAnswersRelations = relations(selfAnswers, ({ one }) => ({
  question: one(questions, {
    fields: [selfAnswers.questionId],
    references: [questions.id],
  }),
  author: one(learnerProfiles, {
    fields: [selfAnswers.authorId],
    references: [learnerProfiles.userId],
  }),
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
  record: one(records, {
    fields: [responses.recordId],
    references: [records.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
  author: one(learnerProfiles, {
    fields: [responses.authorId],
    references: [learnerProfiles.userId],
  }),
  parentResponse: one(responses, {
    fields: [responses.parentResponseId],
    references: [responses.id],
    relationName: "response_replies",
  }),
  childResponses: many(responses, {
    relationName: "response_replies",
  }),
}));

export const sentencesRelations = relations(sentences, ({ many, one }) => ({
  record: one(records, {
    fields: [sentences.recordId],
    references: [records.id],
  }),
  savedBy: one(learnerProfiles, {
    fields: [sentences.savedById],
    references: [learnerProfiles.userId],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(learnerProfiles, {
    fields: [notifications.recipientId],
    references: [learnerProfiles.userId],
  }),
  record: one(records, {
    fields: [notifications.recordId],
    references: [records.id],
  }),
  question: one(questions, {
    fields: [notifications.questionId],
    references: [questions.id],
  }),
}));



export const userRolesRelations = relations(userRoles, ({ one }) => ({
  learner: one(learnerProfiles, {
    fields: [userRoles.userId],
    references: [learnerProfiles.userId],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recordTags: many(recordTags),
}));

export const recordTagsRelations = relations(recordTags, ({ one }) => ({
  record: one(records, {
    fields: [recordTags.recordId],
    references: [records.id],
  }),
  tag: one(tags, {
    fields: [recordTags.tagId],
    references: [tags.id],
  }),
}));

export const draftsRelations = relations(drafts, ({ one }) => ({
  author: one(learnerProfiles, {
    fields: [drafts.authorId],
    references: [learnerProfiles.userId],
  }),
  challenge: one(challenges, {
    fields: [drafts.challengeId],
    references: [challenges.id],
  }),
}));

export const questionRemindersRelations = relations(questionReminders, ({ one }) => ({
  question: one(questions, {
    fields: [questionReminders.questionId],
    references: [questions.id],
  }),
  learner: one(learnerProfiles, {
    fields: [questionReminders.learnerId],
    references: [learnerProfiles.userId],
  }),
}));



export const savedRecordsRelations = relations(savedRecords, ({ one }) => ({
  learner: one(learnerProfiles, {
    fields: [savedRecords.learnerId],
    references: [learnerProfiles.userId],
  }),
  record: one(records, {
    fields: [savedRecords.recordId],
    references: [records.id],
  }),
}));

export const recordReadsRelations = relations(recordReads, ({ one }) => ({
  learner: one(learnerProfiles, {
    fields: [recordReads.learnerId],
    references: [learnerProfiles.userId],
  }),
  record: one(records, {
    fields: [recordReads.recordId],
    references: [records.id],
  }),
}));

export const recordParticipantsRelations = relations(recordParticipants, ({ one }) => ({
  record: one(records, {
    fields: [recordParticipants.recordId],
    references: [records.id],
  }),
  participant: one(learnerProfiles, {
    fields: [recordParticipants.participantUserId],
    references: [learnerProfiles.userId],
    relationName: "participant",
  }),
  addedBy: one(learnerProfiles, {
    fields: [recordParticipants.addedById],
    references: [learnerProfiles.userId],
    relationName: "added_by",
  }),
}));



export const recordReferencesRelations = relations(recordReferences, ({ one }) => ({
  record: one(records, {
    fields: [recordReferences.recordId],
    references: [records.id],
  }),
}));

export const templatesRelations = relations(templates, () => ({}));
export const curationSlotsRelations = relations(curationSlots, () => ({}));
export const auditLogsRelations = relations(auditLogs, () => ({}));
export const settingsRelations = relations(settings, () => ({}));
