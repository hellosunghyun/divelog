import { and, desc, eq, sql } from "drizzle-orm";

import type { CreateQuestionInput } from "../../lib/validation";
import { nanoid } from "../../lib/utils.server";
import { db } from "../client.server";
import { learnerProfiles, questionCarryOvers, questions, records, responses, selfAnswers } from "../schema.server";

export interface OpenQuestionListItem {
  id: string;
  content: string;
  direction: string;
  isOpen: boolean;
  recordSlug: string | null;
  recordTitle: string | null;
  authorName: string;
  createdAt: number;
  type: "personal" | "challenge";
  selfAnswerCount: number;
  responseCount: number;
  isCarryOver: boolean;
}

export async function getQuestionsByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);

  return database.select().from(questions).where(eq(questions.recordId, recordId));
}

export async function getOpenQuestions(d1: D1Database, cohort?: string) {
  const database = db(d1);

  const selfAnswerCounts = database
    .select({
      questionId: selfAnswers.questionId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(selfAnswers)
    .groupBy(selfAnswers.questionId)
    .as("self_answer_counts");

  const responseCounts = database
    .select({
      questionId: responses.questionId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(responses)
    .where(and(sql`${responses.questionId} is not null`, sql`${responses.type} != 'self_answer'`))
    .groupBy(responses.questionId)
    .as("response_counts");

  const carryOverQuestions = database
    .select({
      questionId: questionCarryOvers.newQuestionId,
    })
    .from(questionCarryOvers)
    .where(sql`${questionCarryOvers.newQuestionId} is not null`)
    .groupBy(questionCarryOvers.newQuestionId)
    .as("carry_over_questions");

  const rows = await database
    .select({
      id: questions.id,
      content: questions.content,
      direction: questions.direction,
      isOpen: questions.isOpen,
      recordSlug: records.slug,
      recordTitle: records.title,
      authorName: learnerProfiles.displayName,
      createdAt: questions.createdAt,
      type: sql<"personal" | "challenge">`case when ${records.challengeId} is not null then 'challenge' else 'personal' end`.as("type"),
      selfAnswerCount: sql<number>`coalesce(${selfAnswerCounts.count}, 0)`.as("self_answer_count"),
      responseCount: sql<number>`coalesce(${responseCounts.count}, 0)`.as("response_count"),
      isCarryOver: sql<number>`case when ${carryOverQuestions.questionId} is not null then 1 else 0 end`.as("is_carry_over"),
    })
    .from(questions)
    .leftJoin(records, eq(questions.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .leftJoin(selfAnswerCounts, eq(questions.id, selfAnswerCounts.questionId))
    .leftJoin(responseCounts, eq(questions.id, responseCounts.questionId))
    .leftJoin(carryOverQuestions, eq(questions.id, carryOverQuestions.questionId))
    .where(
      and(
        eq(questions.isOpen, true),
        cohort ? eq(records.cohort, cohort) : sql`1=1`,
        sql`${records.visibility} != 'draft'`,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(20);

  return rows.map((row): OpenQuestionListItem => ({
    ...row,
    authorName: row.authorName ?? "익명",
    isCarryOver: row.isCarryOver > 0,
  }));
}

export async function createQuestion(d1: D1Database, data: CreateQuestionInput) {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(questions).values({
    id,
    recordId: data.recordId,
    content: data.content,
    direction: data.direction ?? "outward",
    isOpen: true,
    createdAt: now,
  });

  return id;
}

export async function getUnansweredQuestions(d1: D1Database, authorId: string) {
  const database = db(d1);

  return database
    .select({
      question: questions,
      recordSlug: records.slug,
    })
    .from(questions)
    .leftJoin(records, eq(questions.recordId, records.id))
    .where(and(eq(records.authorId, authorId), eq(questions.isOpen, true)))
    .orderBy(desc(questions.createdAt));
}

export type UnansweredQuestionByAuthor = typeof questions.$inferSelect & {
  recordSlug: string;
  recordTitle: string;
};

export async function getUnansweredQuestionsByAuthor(
  d1: D1Database,
  authorId: string,
  limit = 10,
): Promise<UnansweredQuestionByAuthor[]> {
  const database = db(d1);

  return database
    .select({
      ...questions,
      recordSlug: records.slug,
      recordTitle: records.title,
    })
    .from(questions)
    .innerJoin(records, eq(questions.recordId, records.id))
    .where(
      and(
        eq(records.authorId, authorId),
        eq(questions.isOpen, true),
        sql`NOT EXISTS (SELECT 1 FROM self_answers WHERE self_answers.question_id = ${questions.id})`,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(limit);
}
