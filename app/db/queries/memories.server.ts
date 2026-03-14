import { and, eq, sql } from "drizzle-orm";

import { db } from "../client.server";
import { collectiveMemories, stages } from "../schema.server";

export async function getCollectiveMemoryByStageSlug(
  d1: D1Database,
  stageSlug: string,
  cohort?: string,
) {
  const database = db(d1);
  const result = await database
    .select({
      memory: collectiveMemories,
    })
    .from(collectiveMemories)
    .leftJoin(stages, eq(collectiveMemories.stageId, stages.id))
    .where(
      and(
        eq(stages.slug, stageSlug),
        eq(collectiveMemories.status, "published"),
        cohort ? eq(collectiveMemories.cohort, cohort) : sql`1=1`,
      ),
    )
    .limit(1);

  return result[0]?.memory ?? null;
}

export async function getAllCollectiveMemories(d1: D1Database, cohort?: string) {
  const database = db(d1);

  if (cohort) {
    return database.select().from(collectiveMemories).where(eq(collectiveMemories.cohort, cohort));
  }

  return database.select().from(collectiveMemories);
}
