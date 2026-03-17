import { and, eq, isNull, or } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { questionCarryOvers } from "../../schema.server";

export type QuestionCarryOver = typeof questionCarryOvers.$inferSelect;

export interface CarryOverInput {
  id?: string;
  originalQuestionId: string;
  fromStageId: string;
  toStageId: string;
  newQuestionId?: string | null;
}

export async function createCarryOver(d1: D1Database, input: CarryOverInput): Promise<QuestionCarryOver> {
  const database = db(d1);
  const id = input.id ?? nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(questionCarryOvers).values({
    id,
    originalQuestionId: input.originalQuestionId,
    fromStageId: input.fromStageId,
    toStageId: input.toStageId,
    newQuestionId: input.newQuestionId ?? null,
    carriedAt: now,
  });

  const created = await database
    .select()
    .from(questionCarryOvers)
    .where(eq(questionCarryOvers.id, id))
    .limit(1);

  if (!created[0]) {
    throw new Error("질문 이월을 생성하지 못했습니다.");
  }

  return created[0];
}

export async function getCarryOversByStage(d1: D1Database, stageId: string): Promise<QuestionCarryOver[]> {
  const database = db(d1);

  return database
    .select()
    .from(questionCarryOvers)
    .where(
      or(
        eq(questionCarryOvers.fromStageId, stageId),
        eq(questionCarryOvers.toStageId, stageId),
      ),
    );
}

export async function getCarryOversByQuestion(d1: D1Database, questionId: string): Promise<QuestionCarryOver[]> {
  const database = db(d1);

  return database
    .select()
    .from(questionCarryOvers)
    .where(
      or(
        eq(questionCarryOvers.originalQuestionId, questionId),
        eq(questionCarryOvers.newQuestionId, questionId),
      ),
    );
}

export async function getPendingCarryOvers(
  d1: D1Database,
  toStageId: string,
): Promise<QuestionCarryOver[]> {
  const database = db(d1);

  return database
    .select()
    .from(questionCarryOvers)
    .where(
      and(
        eq(questionCarryOvers.toStageId, toStageId),
        isNull(questionCarryOvers.newQuestionId),
      ),
    );
}

export async function linkNewQuestion(
  d1: D1Database,
  carryOverId: string,
  newQuestionId: string,
): Promise<void> {
  const database = db(d1);

  await database
    .update(questionCarryOvers)
    .set({ newQuestionId })
    .where(eq(questionCarryOvers.id, carryOverId));
}
