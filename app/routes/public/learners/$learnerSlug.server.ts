import { and, desc, eq, sql } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/$learnerSlug";
import { getRecordsWithMention } from "~/db/queries/dialogue/mentions.server";
import { getRecordsWithParticipant, getParticipantsBatch } from "~/db/queries/records/participants.server";
import { db } from "~/db/client.server";
import { learnerProfiles, questions, records, sentences } from "~/db/schema.server";
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

  const [learnerRecords, learnerQuestions, learnerSentences] = await database.batch([
    database.select({
      record: records,
    }).from(records).where(and(eq(records.authorId, learner.userId), sql`${records.visibility} IN ('cohort', 'public')`)).orderBy(desc(records.createdAt)).limit(12),
    database.select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions).leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.authorId, learner.userId), eq(questions.isOpen, true), sql`${records.visibility} IN ('cohort', 'public')`)).orderBy(desc(questions.createdAt)).limit(5),
    database.select({ sentence: sentences }).from(sentences).leftJoin(records, eq(sentences.recordId, records.id)).where(and(eq(sentences.savedById, learner.userId), sql`${records.visibility} IN ('cohort', 'public')`)).orderBy(desc(sentences.createdAt)).limit(6),
  ]);

  const [participatedRecords, mentionedRecords] = await Promise.all([
    getRecordsWithParticipant(d1, learner.userId, 10).catch(() =>
      [] as Awaited<ReturnType<typeof getRecordsWithParticipant>>
    ),
    getRecordsWithMention(d1, learner.userId, 10).catch(() =>
      [] as Awaited<ReturnType<typeof getRecordsWithMention>>
    ),
  ]);

  const recordIds = learnerRecords.map((item) => item.record.id);
  let participantsRaw: Awaited<ReturnType<typeof getParticipantsBatch>> = [];
  try {
    participantsRaw = await getParticipantsBatch(d1, recordIds);
  } catch { }
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
  };
}
