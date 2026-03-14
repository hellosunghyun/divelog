import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "../client.server";
import { learnerProfiles, questions, records, sentences } from "../schema.server";

export async function searchAll(d1: D1Database, query: string, cohort?: string) {
  const database = db(d1);
  const pattern = `%${query}%`;

  const [foundRecords, foundQuestions, foundLearners, foundSentences] = await database.batch([
    database
      .select({
        id: records.id,
        slug: records.slug,
        title: records.title,
        type: sql<string>`'record'`,
        snippet: records.content,
      })
      .from(records)
      .where(
        and(
          or(like(records.title, pattern), like(records.content, pattern)),
          cohort ? eq(records.cohort, cohort) : sql`1=1`,
          sql`${records.visibility} != 'draft'`,
        ),
      )
      .orderBy(desc(records.createdAt))
      .limit(10),
    database
      .select({
        id: questions.id,
        slug: sql<string | null>`null`,
        title: questions.content,
        type: sql<string>`'question'`,
        snippet: questions.content,
      })
      .from(questions)
      .where(like(questions.content, pattern))
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
  ]);

  return {
    records: foundRecords,
    questions: foundQuestions,
    learners: foundLearners,
    sentences: foundSentences,
  };
}
