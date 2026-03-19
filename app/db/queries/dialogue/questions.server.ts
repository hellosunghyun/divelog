import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";

import type { CreateQuestionInput } from "../../../lib/auth/validation";
import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, questions, records, responses, selfAnswers } from "../../schema.server";

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
  isCarryOver: false;
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
      count: sql<number>`count(*)`.as("self_answer_cnt"),
    })
    .from(selfAnswers)
    .groupBy(selfAnswers.questionId)
    .as("self_answer_counts");

  const responseCounts = database
    .select({
      questionId: responses.questionId,
      count: sql<number>`count(*)`.as("response_cnt"),
    })
    .from(responses)
    .where(and(sql`${responses.questionId} is not null`, sql`${responses.type} != 'self_answer'`))
    .groupBy(responses.questionId)
    .as("response_counts");

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
    })
    .from(questions)
    .leftJoin(records, eq(questions.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .leftJoin(selfAnswerCounts, eq(questions.id, selfAnswerCounts.questionId))
    .leftJoin(responseCounts, eq(questions.id, responseCounts.questionId))
    .where(
      and(
        eq(questions.isOpen, true),
        cohort ? eq(records.cohort, cohort) : undefined,
        sql`${records.visibility} IN ('cohort', 'public')`,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(20);

  return rows.map((row): OpenQuestionListItem => ({
    ...row,
    authorName: row.authorName ?? "익명",
    isCarryOver: false,
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
  const questionColumns = getTableColumns(questions);

  return database
    .select({
      ...questionColumns,
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
