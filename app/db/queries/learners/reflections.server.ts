import { and, eq } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { personalStageReflections } from "../../schema.server";

export type PersonalStageReflection = typeof personalStageReflections.$inferSelect;

export interface ReflectionInput {
  id?: string;
  stageId: string;
  learnerId: string;
  letGo?: string | null;
  carryQuestion?: string | null;
  lastingSentence?: string | null;
}

export async function getPersonalReflection(
  d1: D1Database,
  stageId: string,
  learnerId: string,
): Promise<PersonalStageReflection | null> {
  const database = db(d1);

  const rows = await database
    .select()
    .from(personalStageReflections)
    .where(
      and(
        eq(personalStageReflections.stageId, stageId),
        eq(personalStageReflections.learnerId, learnerId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function upsertPersonalReflection(
  d1: D1Database,
  input: ReflectionInput,
): Promise<PersonalStageReflection> {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  const existing = await getPersonalReflection(d1, input.stageId, input.learnerId);

  if (existing) {
    await database
      .update(personalStageReflections)
      .set({
        letGo: input.letGo ?? null,
        carryQuestion: input.carryQuestion ?? null,
        lastingSentence: input.lastingSentence ?? null,
        updatedAt: now,
      })
      .where(eq(personalStageReflections.id, existing.id));

    const updated = await getPersonalReflection(d1, input.stageId, input.learnerId);
    if (!updated) {
      throw new Error("회고를 다시 불러오지 못했습니다.");
    }

    return updated;
  }

  const id = input.id ?? nanoid();
  await database.insert(personalStageReflections).values({
    id,
    stageId: input.stageId,
    learnerId: input.learnerId,
    letGo: input.letGo ?? null,
    carryQuestion: input.carryQuestion ?? null,
    lastingSentence: input.lastingSentence ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await getPersonalReflection(d1, input.stageId, input.learnerId);
  if (!created) {
    throw new Error("회고를 생성하지 못했습니다.");
  }

  return created;
}
