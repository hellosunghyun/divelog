import { and, asc, eq, isNull, lte } from "drizzle-orm";

import { nanoid } from "../../lib/utils.server";
import { db } from "../client.server";
import { questionReminders } from "../schema.server";

export type QuestionReminder = typeof questionReminders.$inferSelect;

export interface ReminderInput {
  id?: string;
  questionId: string;
  learnerId: string;
  remindAt: number;
}

export async function createReminder(d1: D1Database, input: ReminderInput): Promise<QuestionReminder> {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);
  const id = input.id ?? nanoid();

  await database.insert(questionReminders).values({
    id,
    questionId: input.questionId,
    learnerId: input.learnerId,
    remindAt: input.remindAt,
    sentAt: null,
    createdAt: now,
  });

  const created = await database
    .select()
    .from(questionReminders)
    .where(eq(questionReminders.id, id))
    .limit(1);

  if (!created[0]) {
    throw new Error("리마인드를 생성하지 못했습니다.");
  }

  return created[0];
}

export async function getDueReminders(d1: D1Database, learnerId: string): Promise<QuestionReminder[]> {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  return database
    .select()
    .from(questionReminders)
    .where(
      and(
        eq(questionReminders.learnerId, learnerId),
        isNull(questionReminders.sentAt),
        lte(questionReminders.remindAt, now),
      ),
    )
    .orderBy(asc(questionReminders.remindAt));
}

export async function markReminderSent(d1: D1Database, reminderId: string): Promise<void> {
  const database = db(d1);
  await database
    .update(questionReminders)
    .set({ sentAt: Math.floor(Date.now() / 1000) })
    .where(eq(questionReminders.id, reminderId));
}

export async function getRemindersByQuestion(
  d1: D1Database,
  questionId: string,
): Promise<QuestionReminder[]> {
  const database = db(d1);

  return database
    .select()
    .from(questionReminders)
    .where(eq(questionReminders.questionId, questionId))
    .orderBy(asc(questionReminders.remindAt));
}
