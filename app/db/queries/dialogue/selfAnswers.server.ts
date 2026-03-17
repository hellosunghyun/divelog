import { and, desc, eq, inArray } from "drizzle-orm";

import { nanoid } from "../../../lib/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, questions, selfAnswers } from "../../schema.server";

interface CreateSelfAnswerInput {
  questionId: string;
  content: string;
}

export async function createSelfAnswer(
  d1: D1Database,
  authorId: string,
  data: CreateSelfAnswerInput,
): Promise<string> {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(selfAnswers).values({
    id,
    questionId: data.questionId,
    authorId,
    content: data.content,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getSelfAnswersByQuestion(d1: D1Database, questionId: string) {
  const database = db(d1);

  return database
    .select({
      selfAnswer: selfAnswers,
      author: {
        displayName: learnerProfiles.displayName,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(selfAnswers)
    .leftJoin(learnerProfiles, eq(selfAnswers.authorId, learnerProfiles.userId))
    .where(eq(selfAnswers.questionId, questionId))
    .orderBy(desc(selfAnswers.createdAt));
}

export async function getSelfAnswersByRecord(
  d1: D1Database,
  recordId: string,
): Promise<Array<{ selfAnswer: typeof selfAnswers.$inferSelect; questionId: string; author: { displayName: string | null; profilePhotoUrl: string | null } | null }>> {
  const database = db(d1);

  const recordQuestions = await database
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.recordId, recordId));

  if (recordQuestions.length === 0) {
    return [];
  }

  const questionIds = recordQuestions.map((q) => q.id);

  return database
    .select({
      selfAnswer: selfAnswers,
      questionId: selfAnswers.questionId,
      author: {
        displayName: learnerProfiles.displayName,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(selfAnswers)
    .leftJoin(learnerProfiles, eq(selfAnswers.authorId, learnerProfiles.userId))
    .where(inArray(selfAnswers.questionId, questionIds))
    .orderBy(desc(selfAnswers.createdAt));
}
