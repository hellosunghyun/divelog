import { and, desc, eq, sql } from "drizzle-orm";

import type { CreateQuestionInput } from "../../lib/validation";
import { nanoid } from "../../lib/utils.server";
import { db } from "../client.server";
import { questions, records } from "../schema.server";

export async function getQuestionsByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);

  return database.select().from(questions).where(eq(questions.recordId, recordId));
}

export async function getOpenQuestions(d1: D1Database, cohort?: string) {
  const database = db(d1);

  return database
    .select({
      question: questions,
      recordSlug: records.slug,
      recordTitle: records.title,
    })
    .from(questions)
    .leftJoin(records, eq(questions.recordId, records.id))
    .where(
      and(
        eq(questions.isOpen, true),
        cohort ? eq(records.cohort, cohort) : undefined,
        sql`${records.visibility} != 'draft'`,
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(20);
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
