import { and, desc, eq, sql } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/$learnerSlug";
import { getRecordsWithMention } from "~/db/queries/dialogue/mentions.server";
import { getLearnerSelfAnswerSummary } from "~/db/queries/dialogue/selfAnswers.server";
import { getLearnerInterestTags, getLearnerStageActivity } from "~/db/queries/learners/learners.server";
import { getRecordsWithParticipant, getParticipantsBatch } from "~/db/queries/records/participants.server";
import { db } from "~/db/client.server";
import { learnerProfiles, questions, records, sentences } from "~/db/schema.server";
import { fetchAdaProfile, resolveContextLine, resolveProfileIntro } from "~/lib/auth/ada-profile.server";
import { getAuth } from "~/lib/auth/auth.server";
import { createLogger } from "~/lib/infra/logger.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { learnerSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "learner_detail" });
  logger.info("loader_start");
  const d1 = context.cloudflare.env.DB;
  const database = db(d1);

  const learnerResult = await database.select().from(learnerProfiles).where(eq(learnerProfiles.slug, learnerSlug)).limit(1);
  const learner = learnerResult[0];
  if (!learner) {
    logger.info("not_found", { slug: learnerSlug });
    throw data("러너를 찾을 수 없습니다", { status: 404 });
  }

  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  const isOwner = auth.isAuthenticated && auth.user.id === learner.userId;

  const [learnerRecords, learnerQuestions, learnerSentences] = await database.batch([
    database.select({
      record: records,
    }).from(records).where(and(eq(records.authorId, learner.userId), sql`${records.visibility} IN ('cohort', 'public')`)).orderBy(desc(records.createdAt)).limit(12),
    database.select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions).leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.authorId, learner.userId), eq(questions.isOpen, true), sql`${records.visibility} IN ('cohort', 'public')`)).orderBy(desc(questions.createdAt)).limit(5),
    database.select({ sentence: sentences }).from(sentences).leftJoin(records, eq(sentences.recordId, records.id)).where(and(eq(sentences.savedById, learner.userId), sql`${records.visibility} IN ('cohort', 'public')`)).orderBy(desc(sentences.createdAt)).limit(6),
  ]);

  const [participatedRecordsRaw, mentionedRecordsRaw]: [
    Awaited<ReturnType<typeof getRecordsWithParticipant>>,
    Awaited<ReturnType<typeof getRecordsWithMention>>,
  ] = await Promise.all([
    getRecordsWithParticipant(d1, learner.userId, 10).catch(() =>
      [] as Awaited<ReturnType<typeof getRecordsWithParticipant>>
    ),
    getRecordsWithMention(d1, learner.userId, 10).catch(() =>
      [] as Awaited<ReturnType<typeof getRecordsWithMention>>
    ),
  ]);

  const participatedRecords = isOwner
    ? participatedRecordsRaw
    : participatedRecordsRaw.filter(
      ({ record }: Awaited<ReturnType<typeof getRecordsWithParticipant>>[number]) =>
        record.visibility === "public",
    );
  const mentionedRecords = isOwner
    ? mentionedRecordsRaw
    : mentionedRecordsRaw.filter(
      ({ record }: Awaited<ReturnType<typeof getRecordsWithMention>>[number]) =>
        record.visibility === "public",
    );

  const [interestTags, stageActivity, selfAnswers, adaProfile] = await Promise.all([
    getLearnerInterestTags(d1, learner.userId),
    getLearnerStageActivity(d1, learner.userId, isOwner),
    getLearnerSelfAnswerSummary(d1, learner.userId),
    fetchAdaProfile(learner.userId, context.cloudflare.env.ADAKRPOS_API_KEY),
  ]);

  const profileIntro = resolveProfileIntro(adaProfile, learner.bio);
  const contextLine = resolveContextLine(learner.cohort, stageActivity.currentStage?.name ?? null);

  const recordIds = learnerRecords.map((item: { record: { id: string } }) => item.record.id);
  let participantsRaw: Awaited<ReturnType<typeof getParticipantsBatch>> = [];
  try {
    participantsRaw = await getParticipantsBatch(d1, recordIds);
  } catch (error) {
    logger.warn("participants_batch_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const participantsByRecordId = new Map<string, typeof participantsRaw>();
  for (const p of participantsRaw) {
    const existing = participantsByRecordId.get(p.recordId) ?? [];
    existing.push(p);
    participantsByRecordId.set(p.recordId, existing);
  }

  logger.info("loader_end");
  return {
    learner,
    learnerRecords,
    learnerQuestions,
    learnerSentences,
    collaborationUnits: [] as never[],
    participatedRecords,
    mentionedRecords,
    participantsByRecordId: Object.fromEntries(participantsByRecordId),
    profileIntro,
    contextLine,
    interestTags,
    currentStage: stageActivity.currentStage,
    recentActivity: stageActivity.recentActivity,
    selfAnswers,
  };
}
