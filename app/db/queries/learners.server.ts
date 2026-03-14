import { asc, eq } from "drizzle-orm";

import { nanoid } from "../../lib/utils.server";
import { db } from "../client.server";
import { learnerProfiles } from "../schema.server";

interface AdakrposUser {
  id: string;
  name: string | null;
  nickname: string | null;
  profilePhotoUrl: string | null;
  cohort: string | null;
  isVerified: boolean;
}

function generateSlug(base: string, suffix?: number): string {
  const clean =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 40) || "learner";

  return suffix ? `${clean}-${suffix}` : clean;
}

export async function getLearners(d1: D1Database, cohort?: string) {
  const database = db(d1);

  if (cohort) {
    return database
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.cohort, cohort))
      .orderBy(asc(learnerProfiles.displayName));
  }

  return database.select().from(learnerProfiles).orderBy(asc(learnerProfiles.displayName));
}

export async function getLearnerBySlug(d1: D1Database, slug: string) {
  const database = db(d1);
  const result = await database.select().from(learnerProfiles).where(eq(learnerProfiles.slug, slug)).limit(1);

  return result[0] ?? null;
}

export async function getLearnerByUserId(d1: D1Database, userId: string) {
  const database = db(d1);
  const result = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function getOrCreateLearnerProfile(d1: D1Database, user: AdakrposUser) {
  const database = db(d1);
  const displayName = user.name ?? user.nickname ?? "익명";
  const now = Math.floor(Date.now() / 1000);
  const existing = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, user.id))
    .limit(1);

  if (existing.length > 0) {
    await database
      .update(learnerProfiles)
      .set({
        displayName,
        profilePhotoUrl: user.profilePhotoUrl ?? null,
        cohort: user.cohort ?? null,
        updatedAt: now,
      })
      .where(eq(learnerProfiles.userId, user.id));

    const updated = await database
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, user.id))
      .limit(1);

    return updated[0] ?? existing[0];
  }

  const baseSlug = generateSlug(user.nickname ?? user.name ?? "learner");
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    const slugCheck = await database
      .select({ slug: learnerProfiles.slug })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.slug, slug))
      .limit(1);

    if (slugCheck.length === 0) {
      break;
    }

    attempt += 1;
    slug = generateSlug(baseSlug, attempt + 1);

    if (attempt > 100) {
      slug = `${baseSlug}-${nanoid().substring(0, 6)}`;
      break;
    }
  }

  const newProfile = {
    userId: user.id,
    slug,
    displayName,
    profilePhotoUrl: user.profilePhotoUrl ?? null,
    cohort: user.cohort ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await database.insert(learnerProfiles).values(newProfile);

  const created = await database
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, user.id))
    .limit(1);

  return created[0] ?? newProfile;
}
