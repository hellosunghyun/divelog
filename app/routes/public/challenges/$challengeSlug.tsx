import { data } from "react-router";
import type { Route } from "./+types/$challengeSlug";
import { Link } from "~/components/SmartLink";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import CollaborationUnitCard from "~/components/CollaborationUnitCard";
import QuestionCard from "~/components/QuestionCard";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { motion } from "~/lib/motion";
import { staggerContainer, staggerItem } from "~/lib/motion-utils";
import { cn } from "~/lib/cn";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { challenges, records, collaborationUnits, learnerProfiles, stages, challengeStages } = await import("~/db/schema.server");
  const { createLogger } = await import("~/lib/logger.server");

  const { challengeSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "challenge_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const challengeResult = await database.select().from(challenges).where(eq(challenges.slug, challengeSlug)).limit(1);
  const challenge = challengeResult[0];
  if (!challenge) {
    logger.info("not_found", { slug: challengeSlug });
    throw data("챌린지를 찾을 수 없습니다", { status: 404 });
  }

  const [challengeRecords, challengeCollabs, relatedStages] = await database.batch([
    database.select({
      record: records,
      author: { displayName: learnerProfiles.displayName, slug: learnerProfiles.slug, profilePhotoUrl: learnerProfiles.profilePhotoUrl },
    }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(and(eq(records.challengeId, challenge.id), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(records.createdAt)).limit(12),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.challengeId, challenge.id)),
    database
      .select({ stage: stages })
      .from(challengeStages)
      .innerJoin(stages, eq(challengeStages.stageId, stages.id))
      .where(eq(challengeStages.challengeId, challenge.id)),
  ]);

  logger.info("loader_end");
  return { challenge, challengeRecords, challengeCollabs, relatedStages };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "챌린지 — DiveLog" }];
  return [{ title: `${loaderData.challenge.name} — DiveLog` }];
}

const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  upcoming: "예정",
};

const STATUS_ACCENTS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-challenge/10", text: "text-challenge" },
  completed: { bg: "bg-surface-secondary", text: "text-text-secondary" },
  upcoming: { bg: "bg-mist-blue", text: "text-ocean-blue" },
};

export default function ChallengeDetailPage({ loaderData }: Route.ComponentProps) {
  const { challenge, challengeRecords, challengeCollabs, relatedStages } = loaderData;

  const statusAccent = STATUS_ACCENTS[challenge.status] ?? STATUS_ACCENTS.active;

  return (
    <div>
      <HeroSection
        variant="challenge"
        title={challenge.name}
        subtitle={challenge.problemDefinition ?? undefined}
        accentTone="challenge"
        badge={STATUS_LABELS[challenge.status] ?? challenge.status}
      />

      <div className="max-w-content mx-auto px-6 py-16 md:py-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-12"
        >
          {challenge.currentQuestion && (
            <motion.section variants={staggerItem}>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
                현재 질문
              </h2>
              <QuestionCard
                question={{
                  id: challenge.id,
                  content: challenge.currentQuestion,
                  direction: "outward",
                  isOpen: challenge.status === "active",
                }}
              />
            </motion.section>
          )}

          {challenge.problemDefinition && !challenge.currentQuestion && (
            <motion.section variants={staggerItem}>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
                문제 정의
              </h2>
              <div className="bg-mist-blue/30 rounded-2xl p-6 md:p-8 border border-mist-blue">
                <p className="text-lg text-text-primary leading-relaxed">
                  {challenge.problemDefinition}
                </p>
              </div>
            </motion.section>
          )}

          {relatedStages.length > 0 && (
            <motion.section variants={staggerItem}>
              <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
                관련 Stage
              </h2>
              <div className="flex flex-wrap gap-3">
                {relatedStages.map(({ stage }) => (
                  <Link
                    key={stage.id}
                    to={`/journey/${stage.slug}`}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                      "bg-surface-secondary border border-border",
                      "text-sm font-medium text-text-secondary",
                      "hover:border-ocean-blue/30 hover:text-ocean-blue",
                      "transition-all duration-normal no-underline"
                    )}
                  >
                    {stage.name}
                  </Link>
                ))}
              </div>
            </motion.section>
          )}

          <motion.section variants={staggerItem}>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
              협업 팀
            </h2>
            {challengeCollabs.length === 0 ? (
              <div className="p-8 bg-surface rounded-2xl border border-border text-center">
                <p className="text-text-secondary">이 챌린지는 개인 탐색 중심으로 진행됩니다.</p>
                <p className="text-meta text-text-tertiary mt-2">혼자서의 탐구도 소중한 탐구입니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {challengeCollabs.map((unit) => (
                  <CollaborationUnitCard key={unit.id} unit={unit} />
                ))}
              </div>
            )}
          </motion.section>

          <motion.section variants={staggerItem}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text-primary tracking-tight">
                탐구 기록
              </h2>
              {challengeRecords.length >= 12 && (
                <Link
                  to={`/logs?type=challenge`}
                  className="text-sm text-text-tertiary hover:text-ocean-blue transition-colors no-underline"
                >
                  전체 보기 →
                </Link>
              )}
            </div>
            {challengeRecords.length === 0 ? (
              <EmptyState
                variant="records"
                message="아직 이 챌린지의 기록이 없습니다."
                action={{ label: "이 챌린지에 기록하기", href: "/write" }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {challengeRecords.map(({ record, author }) => (
                  <SceneCard
                    key={record.id}
                    record={{
                      slug: record.slug,
                      title: record.title,
                      content: record.content,
                      format: record.format as "note" | "article",
                      type: record.type as "personal" | "challenge" | "collaboration",
                      rhythm: record.rhythm ?? undefined,
                      createdAt: record.createdAt,
                    }}
                    author={author?.displayName ? { displayName: author.displayName, slug: author.slug ?? "" } : undefined}
                  />
                ))}
              </div>
            )}
          </motion.section>

          <motion.section variants={staggerItem}>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
              전환점
            </h2>
            <EmptyState variant="generic" message="아직 기록된 전환점이 없습니다." />
          </motion.section>

          <motion.section variants={staggerItem}>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
              회고
            </h2>
            <EmptyState variant="generic" message="아직 작성된 회고가 없습니다." />
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">챌린지를 찾을 수 없습니다</p>
      <Link
        to="/challenges"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        목록으로
      </Link>
    </div>
  );
}
