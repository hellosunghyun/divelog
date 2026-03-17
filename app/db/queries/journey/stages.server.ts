import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "../../client.server";
import { stages } from "../../schema.server";

export async function getStages(d1: D1Database, cohort?: string) {
  const database = db(d1);
  const where = cohort ? eq(stages.cohort, cohort) : undefined;

  return database.select().from(stages).where(where).orderBy(asc(stages.order));
}

export async function getCurrentStage(d1: D1Database, cohort?: string) {
  const database = db(d1);
  const conditions = [eq(stages.isCurrent, true)];

  if (cohort) {
    conditions.push(eq(stages.cohort, cohort));
  }

  const result = await database
    .select()
    .from(stages)
    .where(and(...conditions))
    .limit(1);

  return result[0] ?? null;
}

export async function getStageBySlug(d1: D1Database, slug: string) {
  const database = db(d1);
  const result = await database.select().from(stages).where(eq(stages.slug, slug)).limit(1);

  return result[0] ?? null;
}

export async function getNextStage(d1: D1Database, currentStageId: string) {
  const database = db(d1);
  const currentStageResult = await database
    .select({ order: stages.order, cohort: stages.cohort })
    .from(stages)
    .where(eq(stages.id, currentStageId))
    .limit(1);

  const currentStage = currentStageResult[0];
  if (!currentStage) {
    return null;
  }

  const nextStageResult = await database
    .select()
    .from(stages)
    .where(
      and(
        eq(stages.order, currentStage.order + 1),
        currentStage.cohort ? eq(stages.cohort, currentStage.cohort) : isNull(stages.cohort),
      ),
    )
    .limit(1);

  return nextStageResult[0] ?? null;
}

export async function updateStageStatus(d1: D1Database, id: string, status: string) {
  const database = db(d1);

  return database
    .update(stages)
    .set({ status, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(stages.id, id));
}

export async function setCurrentStage(d1: D1Database, id: string) {
  const database = db(d1);

  await database.update(stages).set({ isCurrent: false });

  return database
    .update(stages)
    .set({ isCurrent: true, status: "active", updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(stages.id, id));
}
