import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "../../client.server";
import { learnerProfiles, questions, records, sentences } from "../../schema.server";

export type Question = typeof questions.$inferSelect;

export async function searchQuestions(
  d1: D1Database,
  query: string,
  options: { cohort?: string; limit?: number } = {},
): Promise<(Question & { recordSlug: string; recordTitle: string; authorName: string })[]> {
  const database = db(d1);
  const pattern = `%${query}%`;

  return database
    .select({
      id: questions.id,
      recordId: questions.recordId,
      content: questions.content,
      direction: questions.direction,
      isOpen: questions.isOpen,
      createdAt: questions.createdAt,
      updatedAt: questions.updatedAt,
      closedAt: questions.closedAt,
      recordSlug: records.slug,
      recordTitle: records.title,
      authorName: sql<string>`coalesce(${learnerProfiles.displayName}, '')`,
    })
    .from(questions)
    .innerJoin(records, eq(questions.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(
      and(
        like(questions.content, pattern),
        options.cohort ? eq(records.cohort, options.cohort) : sql`1=1`,
        sql`${records.visibility} != 'draft'`,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(options.limit ?? 10);
}

export async function searchAll(d1: D1Database, query: string, cohort?: string) {
  const database = db(d1);
  const pattern = `%${query}%`;

  const [foundQuestions, [foundRecords, foundLearners, foundSentences]] = await Promise.all([
    searchQuestions(d1, query, { cohort, limit: 10 }),
    database.batch([
      database
        .select({
          id: records.id,
          slug: records.slug,
          title: records.title,
          type: sql<string>`'record'`,
          snippet: records.contentText,
          format: records.format,
          rhythm: records.rhythm,
          authorDisplayName: learnerProfiles.displayName,
          authorSlug: learnerProfiles.slug,
        })
        .from(records)
        .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
        .where(
          and(
            or(like(records.title, pattern), like(records.contentText, pattern)),
            cohort ? eq(records.cohort, cohort) : sql`1=1`,
            sql`${records.visibility} != 'draft'`,
          ),
        )
        .orderBy(desc(records.createdAt))
        .limit(10),
      database
        .select({
          id: learnerProfiles.userId,
          slug: learnerProfiles.slug,
          title: learnerProfiles.displayName,
          type: sql<string>`'learner'`,
          snippet: learnerProfiles.bio,
        })
        .from(learnerProfiles)
        .where(
          and(
            like(learnerProfiles.displayName, pattern),
            cohort ? eq(learnerProfiles.cohort, cohort) : sql`1=1`,
          ),
        )
        .limit(10),
      database
        .select({
          id: sentences.id,
          slug: sql<string | null>`null`,
          title: sentences.content,
          type: sql<string>`'sentence'`,
          snippet: sentences.reason,
        })
        .from(sentences)
        .where(like(sentences.content, pattern))
        .limit(10),
    ]),
  ]);

  return {
    records: foundRecords,
    questions: foundQuestions.map((question) => ({
      id: question.id,
      slug: question.recordSlug,
      title: question.content,
      type: "question",
      snippet: question.content,
    })),
    learners: foundLearners,
    sentences: foundSentences,
  };
}
