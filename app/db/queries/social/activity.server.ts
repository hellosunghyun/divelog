import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../../client.server";
import {
  learnerProfiles,
  questions,
  records,
  responses,
  selfAnswers,
  sentences,
  stages,
} from "../../schema.server";

export interface DigestItem {
  type: "new_record" | "new_question" | "new_response" | "new_self_answer" | "new_sentence";
  text: string;
  linkTo: string;
  authorName: string;
  createdAt: number;
}

export interface ActivityItem {
  type: "record" | "question" | "response" | "collaboration";
  period: "today" | "this_week" | "last_week";
  timestamp: number;
  summary: string;
  linkTo: string;
}

interface DigestQueryOptions {
  limit?: number;
  stageId?: string;
  cohort?: string | null;
}

interface RecordDigestRow {
  slug: string;
  title: string;
  createdAt: number;
  authorDisplayName: string | null;
}

interface QuestionDigestRow {
  recordSlug: string;
  questionContent: string;
  createdAt: number;
  authorDisplayName: string | null;
}

interface ResponseDigestRow {
  recordSlug: string;
  recordTitle: string;
  createdAt: number;
  authorDisplayName: string | null;
}

interface SelfAnswerDigestRow {
  recordSlug: string;
  createdAt: number;
  authorDisplayName: string | null;
}

interface SentenceDigestRow {
  recordSlug: string;
  recordTitle: string;
  createdAt: number;
  authorDisplayName: string | null;
}

function getQuestionPreview(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 44) {
    return trimmed;
  }
  return `${trimmed.slice(0, 44).trimEnd()}...`;
}

async function resolveStageCohort(
  database: ReturnType<typeof db>,
  stageId?: string,
): Promise<string | null> {
  if (stageId) {
    const [stage] = await database
      .select({ cohort: stages.cohort })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    return stage?.cohort ?? null;
  }

  const [currentStage] = await database
    .select({ cohort: stages.cohort })
    .from(stages)
    .where(eq(stages.isCurrent, true))
    .limit(1);

  return currentStage?.cohort ?? null;
}

export async function getNarrativeDigest(
  d1: D1Database,
  options: DigestQueryOptions = {},
): Promise<DigestItem[]> {
  const database = db(d1);
  const limit = options.limit ?? 8;
  const twoWeeksAgo = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
  const stageCohort =
    options.cohort !== undefined ? options.cohort : await resolveStageCohort(database, options.stageId);

  const recordWhere = stageCohort
    ? and(
        gte(records.createdAt, twoWeeksAgo),
        sql`${records.visibility} IN ('cohort', 'public')`,
        eq(records.cohort, stageCohort),
      )
    : and(gte(records.createdAt, twoWeeksAgo), sql`${records.visibility} IN ('cohort', 'public')`);

  const [recordRows, questionRows, responseRows, selfAnswerRows, sentenceRows] = await Promise.all([
    database
      .select({
        slug: records.slug,
        title: records.title,
        createdAt: records.createdAt,
        authorDisplayName: learnerProfiles.displayName,
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(recordWhere)
      .orderBy(desc(records.createdAt))
      .limit(limit) as Promise<RecordDigestRow[]>,
    database
      .select({
        recordSlug: records.slug,
        questionContent: questions.content,
        createdAt: questions.createdAt,
        authorDisplayName: learnerProfiles.displayName,
      })
      .from(questions)
      .innerJoin(records, eq(questions.recordId, records.id))
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(and(recordWhere, gte(questions.createdAt, twoWeeksAgo)))
      .orderBy(desc(questions.createdAt))
      .limit(limit) as Promise<QuestionDigestRow[]>,
    database
      .select({
        recordSlug: records.slug,
        recordTitle: records.title,
        createdAt: responses.createdAt,
        authorDisplayName: learnerProfiles.displayName,
      })
      .from(responses)
      .innerJoin(records, eq(responses.recordId, records.id))
      .leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId))
      .where(
        and(
          recordWhere,
          gte(responses.createdAt, twoWeeksAgo),
          eq(responses.moderationStatus, "clean"),
          sql`${responses.type} != 'self_answer'`,
        ),
      )
      .orderBy(desc(responses.createdAt))
      .limit(limit) as Promise<ResponseDigestRow[]>,
    database
      .select({
        recordSlug: records.slug,
        createdAt: selfAnswers.createdAt,
        authorDisplayName: learnerProfiles.displayName,
      })
      .from(selfAnswers)
      .innerJoin(questions, eq(selfAnswers.questionId, questions.id))
      .innerJoin(records, eq(questions.recordId, records.id))
      .leftJoin(learnerProfiles, eq(selfAnswers.authorId, learnerProfiles.userId))
      .where(and(recordWhere, gte(selfAnswers.createdAt, twoWeeksAgo)))
      .orderBy(desc(selfAnswers.createdAt))
      .limit(limit) as Promise<SelfAnswerDigestRow[]>,
    database
      .select({
        recordSlug: records.slug,
        recordTitle: records.title,
        createdAt: sentences.createdAt,
        authorDisplayName: learnerProfiles.displayName,
      })
      .from(sentences)
      .innerJoin(records, eq(sentences.recordId, records.id))
      .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
      .where(and(recordWhere, gte(sentences.createdAt, twoWeeksAgo)))
      .orderBy(desc(sentences.createdAt))
      .limit(limit) as Promise<SentenceDigestRow[]>,
  ]);

  const digestItems: DigestItem[] = [
    ...recordRows.map((row) => {
      const authorName = row.authorDisplayName?.trim() || "익명";
      return {
        type: "new_record" as const,
        text: `${authorName}님이 새 기록을 남겼습니다: ${row.title}`,
        linkTo: `/logs/${row.slug}`,
        authorName,
        createdAt: row.createdAt,
      };
    }),
    ...questionRows.map((row) => {
      const authorName = row.authorDisplayName?.trim() || "익명";
      return {
        type: "new_question" as const,
        text: `${authorName}님이 질문을 남겼습니다: ${getQuestionPreview(row.questionContent)}`,
        linkTo: `/logs/${row.recordSlug}#question`,
        authorName,
        createdAt: row.createdAt,
      };
    }),
    ...responseRows.map((row) => {
      const authorName = row.authorDisplayName?.trim() || "익명";
      return {
        type: "new_response" as const,
        text: `${authorName}님이 ${row.recordTitle}에 응답을 남겼습니다`,
        linkTo: `/logs/${row.recordSlug}`,
        authorName,
        createdAt: row.createdAt,
      };
    }),
    ...selfAnswerRows.map((row) => {
      const authorName = row.authorDisplayName?.trim() || "익명";
      return {
        type: "new_self_answer" as const,
        text: `${authorName}님이 자신의 질문에 답했습니다`,
        linkTo: `/logs/${row.recordSlug}#question`,
        authorName,
        createdAt: row.createdAt,
      };
    }),
    ...sentenceRows.map((row) => {
      const authorName = row.authorDisplayName?.trim() || "익명";
      return {
        type: "new_sentence" as const,
        text: `${authorName}님이 ${row.recordTitle}에서 문장을 남겼습니다`,
        linkTo: `/logs/${row.recordSlug}`,
        authorName,
        createdAt: row.createdAt,
      };
    }),
  ];

  return digestItems
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.min(Math.max(limit, 5), 8));
}

function digestTypeToActivityType(
  t: DigestItem["type"],
): ActivityItem["type"] {
  switch (t) {
    case "new_record":
      return "record";
    case "new_question":
      return "question";
    case "new_response":
    case "new_self_answer":
      return "response";
    case "new_sentence":
      return "record";
  }
}

function timestampToPeriod(ts: number): ActivityItem["period"] {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = nowSec - ts;
  const oneDay = 86_400;
  const oneWeek = 7 * oneDay;

  if (diffSec < oneDay) return "today";
  if (diffSec < oneWeek) return "this_week";
  return "last_week";
}

export async function getRecentActivity(
  d1: D1Database,
  options: DigestQueryOptions = {},
): Promise<ActivityItem[]> {
  const digest = await getNarrativeDigest(d1, options);

  return digest.map((item) => ({
    type: digestTypeToActivityType(item.type),
    period: timestampToPeriod(item.createdAt),
    timestamp: item.createdAt,
    summary: item.text,
    linkTo: item.linkTo,
  }));
}
