import { and, asc, eq } from "drizzle-orm";

import { db } from "../client.server";
import { stages } from "../schema.server";

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
