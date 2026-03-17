import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, records, stages } from "../../schema.server";

interface AdakrposUser {
  id: string;
  email: string | null;
  verifiedEmail: string | null;
  name: string | null;
  nickname: string | null;
  profilePhotoUrl: string | null;
  cohort: string | null;
  isVerified: boolean;
}

function normalizePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `https://ada-kr-pos.com${url.startsWith("/") ? "" : "/"}${url}`;
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
  const displayName = user.nickname ?? user.name ?? "익명";
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
        email: user.verifiedEmail ?? user.email ?? null,
        profilePhotoUrl: normalizePhotoUrl(user.profilePhotoUrl),
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
    email: user.verifiedEmail ?? user.email ?? null,
    profilePhotoUrl: normalizePhotoUrl(user.profilePhotoUrl),
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

export interface LearnerWithActivity {
  userId: string;
  slug: string;
  displayName: string;
  profilePhotoUrl: string | null;
  cohort: string | null;
  bio: string | null;
  currentQuestion: string | null;
  currentStageId: string | null;
  recentRecord: { slug: string; title: string; createdAt: number } | null;
  stage: { name: string } | null;
  lastActivityAt: number | null;
}

export async function getLearnersWithActivity(
  d1: D1Database,
  cohort?: string,
): Promise<LearnerWithActivity[]> {
  const database = db(d1);

  const learnersQuery = cohort
    ? database
        .select()
        .from(learnerProfiles)
        .where(eq(learnerProfiles.cohort, cohort))
    : database.select().from(learnerProfiles);

  const learners = await learnersQuery;

  if (learners.length === 0) {
    return [];
  }

  const userIds = learners.map((l) => l.userId);

  const allRecords = await database
    .select({
      authorId: records.authorId,
      slug: records.slug,
      title: records.title,
      createdAt: records.createdAt,
    })
    .from(records)
    .where(sql`${records.authorId} IN ${userIds} AND ${records.visibility} != 'draft'`)
    .orderBy(desc(records.createdAt));

  const mostRecentRecordByAuthor = new Map<
    string,
    { slug: string; title: string; createdAt: number }
  >();
  for (const record of allRecords) {
    if (!mostRecentRecordByAuthor.has(record.authorId)) {
      mostRecentRecordByAuthor.set(record.authorId, {
        slug: record.slug,
        title: record.title,
        createdAt: record.createdAt,
      });
    }
  }

  const stageIds = [
    ...new Set(
      learners
        .filter((l) => l.currentStageId !== null)
        .map((l) => l.currentStageId),
    ),
  ];

  const stageMap = new Map<string, { name: string }>();
  if (stageIds.length > 0) {
    const stagesData = await database
      .select({ id: stages.id, name: stages.name })
      .from(stages)
      .where(sql`${stages.id} IN ${stageIds}`);

    for (const stage of stagesData) {
      stageMap.set(stage.id, { name: stage.name });
    }
  }

  const learnersWithActivity: LearnerWithActivity[] = learners.map((learner) => {
    const recentRecord = mostRecentRecordByAuthor.get(learner.userId) ?? null;

    return {
      userId: learner.userId,
      slug: learner.slug,
      displayName: learner.displayName,
      profilePhotoUrl: learner.profilePhotoUrl,
      cohort: learner.cohort,
      bio: learner.bio,
      currentQuestion: learner.currentQuestion,
      currentStageId: learner.currentStageId,
      recentRecord,
      stage: learner.currentStageId ? (stageMap.get(learner.currentStageId) ?? null) : null,
      lastActivityAt: recentRecord?.createdAt ?? null,
    };
  });

  learnersWithActivity.sort((a, b) => {
    if (a.lastActivityAt === null && b.lastActivityAt === null) return 0;
    if (a.lastActivityAt === null) return 1;
    if (b.lastActivityAt === null) return -1;
    return b.lastActivityAt - a.lastActivityAt;
  });

  return learnersWithActivity;
}

export async function getDistinctCohorts(d1: D1Database): Promise<string[]> {
  const database = db(d1);

  const result = await database
    .selectDistinct({ cohort: learnerProfiles.cohort })
    .from(learnerProfiles)
    .where(isNotNull(learnerProfiles.cohort));

  return result.map((r) => r.cohort as string).sort();
}
