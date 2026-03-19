import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, questions, records, recordTags, stages, tags } from "../../schema.server";

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

function extractEmailPrefix(email: string | null | undefined): string | null {
  if (!email) return null;
  const prefix = email.split("@")[0];
  if (!prefix) return null;
  const clean = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
  return clean || null;
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
    const updateData: Record<string, unknown> = {
      displayName,
      email: user.verifiedEmail ?? user.email ?? null,
      profilePhotoUrl: normalizePhotoUrl(user.profilePhotoUrl),
      cohort: user.cohort ?? null,
      updatedAt: now,
    };

    // 기존 slug가 fallback("learner" 또는 "learner-N")이면 이메일 기반으로 재생성
    const currentSlug = existing[0].slug;
    if (/^learner(-\d+)?$/.test(currentSlug)) {
      const emailPrefix = extractEmailPrefix(user.verifiedEmail ?? user.email);
      if (emailPrefix) {
        // Generate candidates upfront
        const MAX_ATTEMPTS = 10;
        const candidates = [emailPrefix];
        for (let i = 2; i <= MAX_ATTEMPTS; i++) {
          candidates.push(`${emailPrefix}-${i}`);
        }

        // Single query to find taken slugs
        const taken = await database
          .select({ slug: learnerProfiles.slug })
          .from(learnerProfiles)
          .where(inArray(learnerProfiles.slug, candidates));
        const takenSet = new Set(taken.map(r => r.slug));

        // Pick first available, excluding current slug
        let newSlug = candidates.find(c => !takenSet.has(c) && c !== currentSlug);
        if (!newSlug) {
          newSlug = `${emailPrefix}-${nanoid().substring(0, 6)}`;
        }
        updateData.slug = newSlug;
      }
    }

    await database
      .update(learnerProfiles)
      .set(updateData)
      .where(eq(learnerProfiles.userId, user.id));

    const updated = await database
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, user.id))
      .limit(1);

    return updated[0] ?? existing[0];
  }

  const emailPrefix = extractEmailPrefix(user.verifiedEmail ?? user.email);
  const baseSlug = generateSlug(emailPrefix ?? user.nickname ?? user.name ?? "learner");

  // Generate candidates upfront
  const MAX_ATTEMPTS = 10;
  const candidates = [baseSlug];
  for (let i = 2; i <= MAX_ATTEMPTS; i++) {
    candidates.push(generateSlug(baseSlug, i));
  }

  // Single query to find taken slugs
  const taken = await database
    .select({ slug: learnerProfiles.slug })
    .from(learnerProfiles)
    .where(inArray(learnerProfiles.slug, candidates));
  const takenSet = new Set(taken.map(r => r.slug));

  // Pick first available
  let slug = candidates.find(c => !takenSet.has(c)) ?? `${baseSlug}-${nanoid().substring(0, 6)}`;

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
  const stageIds = [
    ...new Set(
      learners
        .filter((l) => l.currentStageId !== null)
        .map((l) => l.currentStageId),
    ),
  ];

  const [latestRecords, stagesData] = await Promise.all([
    database
      .select({
        authorId: records.authorId,
        slug: records.slug,
        title: records.title,
        createdAt: records.createdAt,
      })
      .from(records)
      .where(
        and(
          inArray(records.authorId, userIds),
          sql`${records.visibility} IN ('cohort', 'public')`,
          sql`${records.id} = (
            SELECT r2.id
            FROM records r2
            WHERE r2.author_id = ${records.authorId}
              AND r2.visibility IN ('cohort', 'public')
            ORDER BY r2.created_at DESC, r2.id DESC
            LIMIT 1
          )`,
        ),
      ),
    stageIds.length > 0
      ? database
          .select({ id: stages.id, name: stages.name })
          .from(stages)
          .where(inArray(stages.id, stageIds as string[]))
      : Promise.resolve([]),
  ]);

  const mostRecentRecordByAuthor = new Map<
    string,
    { slug: string; title: string; createdAt: number }
  >();
  for (const record of latestRecords) {
    mostRecentRecordByAuthor.set(record.authorId, {
      slug: record.slug,
      title: record.title,
      createdAt: record.createdAt,
    });
  }

  const stageMap = new Map<string, { name: string }>();
  for (const stage of stagesData) {
    stageMap.set(stage.id, { name: stage.name });
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

export async function getLearnerInterestTags(
  d1: D1Database,
  learnerId: string,
): Promise<Array<{ slug: string; name: string }>> {
  const database = db(d1);

  const tagResults = await database
    .select({
      slug: tags.slug,
      name: tags.name,
    })
    .from(tags)
    .innerJoin(recordTags, eq(tags.id, recordTags.tagId))
    .innerJoin(records, eq(recordTags.recordId, records.id))
    .where(
      sql`${records.authorId} = ${learnerId} AND ${records.visibility} IN ('cohort', 'public')`,
    );

  const tagMap = new Map<string, { slug: string; name: string; count: number }>();

  for (const tag of tagResults) {
    const key = tag.slug;
    if (tagMap.has(key)) {
      const existing = tagMap.get(key)!;
      existing.count += 1;
    } else {
      tagMap.set(key, { slug: tag.slug, name: tag.name, count: 1 });
    }
  }

  const deduplicated = Array.from(tagMap.values());
  deduplicated.sort((a, b) => b.count - a.count);

  return deduplicated.map(({ slug, name }) => ({ slug, name }));
}

export interface LearnerStageActivityResult {
  currentStage: {
    id: string;
    name: string;
    slug: string;
  } | null;
  recentActivity: {
    recordCount: number;
    questionCount: number;
    lastActiveAt: string | null;
  };
}

export async function getLearnerStageActivity(
  d1: D1Database,
  learnerId: string,
  isOwner: boolean,
  currentStageId?: string | null,
): Promise<LearnerStageActivityResult> {
  const database = db(d1);

  let resolvedCurrentStageId = currentStageId;
  if (resolvedCurrentStageId === undefined) {
    const learner = await database
      .select({ currentStageId: learnerProfiles.currentStageId })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, learnerId))
      .limit(1);

    resolvedCurrentStageId = learner[0]?.currentStageId ?? null;
  }

  const recordsQuery = isOwner
    ? database
        .select({ createdAt: records.createdAt })
        .from(records)
        .where(eq(records.authorId, learnerId))
    : database
        .select({ createdAt: records.createdAt })
        .from(records)
        .where(
          sql`${records.authorId} = ${learnerId} AND ${records.visibility} IN ('cohort', 'public')`,
        );

  const questionsQuery = database
    .select({ createdAt: questions.createdAt })
    .from(questions)
    .leftJoin(records, eq(questions.recordId, records.id))
    .where(eq(records.authorId, learnerId));

  const stageQuery = resolvedCurrentStageId
    ? database
        .select({ id: stages.id, name: stages.name, slug: stages.slug })
        .from(stages)
        .where(eq(stages.id, resolvedCurrentStageId))
        .limit(1)
    : Promise.resolve([] as Array<{ id: string; name: string; slug: string }>);

  const [recordsList, questionsList, stageResult] = await Promise.all([
    recordsQuery,
    questionsQuery,
    stageQuery,
  ]);

  const currentStage = stageResult[0] ?? null;

  const allTimestamps = [
    ...recordsList.map((r) => r.createdAt),
    ...questionsList.map((q) => q.createdAt),
  ];

  const lastActiveAt =
    allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps) * 1000).toISOString()
      : null;

  return {
    currentStage,
    recentActivity: {
      recordCount: recordsList.length,
      questionCount: questionsList.length,
      lastActiveAt,
    },
  };
}
