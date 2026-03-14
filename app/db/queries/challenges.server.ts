import { asc, eq } from "drizzle-orm";

import { db } from "../client.server";
import { challenges } from "../schema.server";

export async function getChallenges(d1: D1Database, cohort?: string) {
  const database = db(d1);

  if (cohort) {
    return database
      .select()
      .from(challenges)
      .where(eq(challenges.cohort, cohort))
      .orderBy(asc(challenges.name));
  }

  return database.select().from(challenges).orderBy(asc(challenges.name));
}

export async function getChallengeBySlug(d1: D1Database, slug: string) {
  const database = db(d1);
  const result = await database.select().from(challenges).where(eq(challenges.slug, slug)).limit(1);

  return result[0] ?? null;
}

export async function getChallengeById(d1: D1Database, id: string) {
  const database = db(d1);
  const result = await database.select().from(challenges).where(eq(challenges.id, id)).limit(1);

  return result[0] ?? null;
}
