import { data } from "react-router";
import type { Route } from "./+types/$learnerSlug";
import { Link } from "~/components/content/SmartLink";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import SceneCard from "~/components/cards/SceneCard";
import QuestionCard from "~/components/cards/QuestionCard";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
// [COLLAB_DISABLED] import CollaborationUnitCard from "~/components/cards/CollaborationUnitCard";
import EmptyState from "~/components/feedback/EmptyState";
import { motion } from "~/lib/motion/motion";
import { staggerContainer, staggerItem, fadeUp } from "~/lib/motion/motion-utils";
import { cn } from "~/lib/utils/cn";
import { useState } from "react";

const cache = new Map<string, unknown>();

type TabKey = "records" | "questions";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { learnerProfiles, records, questions, sentences, stages } = await import("~/db/schema.server");
  const { createLogger } = await import("~/lib/infra/logger.server");

  const { learnerSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "learner_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const learnerResult = await database.select().from(learnerProfiles).where(eq(learnerProfiles.slug, learnerSlug)).limit(1);
  const learner = learnerResult[0];
  if (!learner) {
    logger.info("not_found", { slug: learnerSlug });
    throw data("러너를 찾을 수 없습니다", { status: 404 });
  }

  const [learnerRecords, learnerQuestions, learnerSentences] = await database.batch([
    database.select({
      record: records,
    }).from(records).where(and(eq(records.authorId, learner.userId), sql`${records.visibility} != 'draft'`)).orderBy(desc(records.createdAt)).limit(12),
    database.select({ question: questions, recordSlug: records.slug, recordTitle: records.title })
      .from(questions).leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.authorId, learner.userId), eq(questions.isOpen, true), sql`${records.visibility} != 'draft'`)).orderBy(desc(questions.createdAt)).limit(5),
    database.select({ sentence: sentences }).from(sentences).leftJoin(records, eq(sentences.recordId, records.id)).where(and(eq(sentences.savedById, learner.userId), sql`${records.visibility} != 'draft'`)).orderBy(desc(sentences.createdAt)).limit(6),
  ]);

  const recordsWithStage = await database
    .select({
      stageId: records.stageId,
      stageName: stages.name,
      stageSlug: stages.slug,
    })
    .from(records)
    .leftJoin(stages, eq(records.stageId, stages.id))
    .where(and(eq(records.authorId, learner.userId), ne(records.visibility, "draft")));

  const stageCountMap = new Map<string, { stageId: string | null; stageName: string | null; stageSlug: string | null; count: number }>();
  for (const row of recordsWithStage) {
    const key = row.stageId ?? "no-stage";
    const existing = stageCountMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      stageCountMap.set(key, {
        stageId: row.stageId,
        stageName: row.stageName,
        stageSlug: row.stageSlug,
        count: 1,
      });
    }
  }
  const recordsByStage = Array.from(stageCountMap.values());

  // [COLLAB_DISABLED] collaboration query removed

  logger.info("loader_end");
  return { learner, learnerRecords, learnerQuestions, learnerSentences, recordsByStage, collaborationUnits: [] as never[] };
}

export async function clientLoader({ params, serverLoader }: {
  params: { learnerSlug?: string };
  serverLoader: () => Promise<unknown>;
}) {
  const key = params.learnerSlug ?? "";
  if (cache.has(key)) return cache.get(key);
  const loaderData = await serverLoader();
  cache.set(key, loaderData);
  return loaderData;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "러너 — DiveLog" }];
  const typedData = loaderData as Awaited<ReturnType<typeof loader>>;
  return [{ title: `${typedData.learner.displayName} — DiveLog` }];
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-2.5 text-sm font-medium rounded-full transition-premium",
        "focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:outline-none",
        active
          ? "bg-ocean-blue text-white"
          : "bg-surface-secondary text-text-secondary hover:bg-border hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

export default function LearnerDetailPage({ loaderData }: Route.ComponentProps) {
  const { learner, learnerRecords, learnerQuestions, learnerSentences, recordsByStage, collaborationUnits } = loaderData as Awaited<ReturnType<typeof loader>>;
  const [activeTab, setActiveTab] = useState<TabKey>("records");

  const tabItems: { key: TabKey; label: string; count: number }[] = [
    { key: "records", label: "기록", count: learnerRecords.length },
    { key: "questions", label: "질문", count: learnerQuestions.length },
  ];

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-b from-mist-blue/60 via-mist-blue/30 to-bg py-12 md:py-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-content mx-auto px-6"
        >
          <div className="flex flex-col md:flex-row items-start gap-6">
            <motion.div variants={staggerItem}>
              {learner.profilePhotoUrl ? (
                <img
                  src={learner.profilePhotoUrl}
                  alt={learner.displayName}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-mist-blue flex items-center justify-center text-2xl md:text-3xl text-ocean-blue font-semibold ring-2 ring-border">
                  {learner.displayName[0]}
                </div>
              )}
            </motion.div>

            <motion.div variants={staggerItem} className="flex-1">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
                {learner.displayName}
              </h1>
              {learner.cohort && (
                <p className="text-meta text-text-secondary mt-1">{learner.cohort}</p>
              )}
              {learner.bio && (
                <p className="text-base text-text-secondary leading-body mt-3 max-w-[600px]">
                  {learner.bio}
                </p>
              )}
              {learner.currentQuestion && (
                <div className="mt-6 p-5 bg-mist-blue/50 rounded-2xl border border-mist-blue">
                  <span className="text-xs font-medium text-ocean-blue uppercase tracking-wide">
                    지금 탐구 중인 질문
                  </span>
                  <p className="text-xl md:text-2xl font-medium leading-relaxed text-text-primary mt-2">
                    "{learner.currentQuestion}"
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </section>

      <div className="max-w-content mx-auto px-6 pt-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex gap-2 mb-8"
        >
          {tabItems.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} {tab.count}
            </TabButton>
          ))}
        </motion.div>

        {activeTab === "records" && (
          <motion.section
            key="records"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {learnerRecords.length === 0 ? (
              <EmptyState variant="records" message="아직 작성한 기록이 없습니다." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {learnerRecords.map((item) => {
                  const { record } = item;
                  return (
                    <motion.div key={record.id} variants={staggerItem}>
                      <SceneCard
                        record={{
                          slug: record.slug,
                          title: record.title,
                          content: record.content,
                          format: record.format as "note" | "article",
                          type: record.type as "personal" | "challenge" | "collaboration",
                          rhythm: record.rhythm ?? undefined,
                          createdAt: record.createdAt,
                        }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}

        {activeTab === "questions" && (
          <motion.section
            key="questions"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {learnerQuestions.length === 0 ? (
              <EmptyState variant="generic" message="아직 남긴 질문이 없습니다." />
            ) : (
              <div className="flex flex-col gap-5">
                {learnerQuestions.map((item) => {
                  const { question, recordSlug, recordTitle } = item;
                  return (
                    <motion.div key={question.id} variants={staggerItem}>
                      <QuestionCard
                        question={question}
                        record={recordSlug && recordTitle ? { slug: recordSlug, title: recordTitle } : undefined}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </div>

      {learnerSentences.length > 0 && (
        <section className="max-w-content mx-auto px-6 py-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            남겨둔 문장들
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5"
          >
            {learnerSentences.map((item) => {
              const { sentence } = item;
              return (
                <motion.div key={sentence.id} variants={staggerItem}>
                  <HighlightedSentenceCard sentence={sentence} />
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      )}

      {recordsByStage.length > 0 && (
        <section className="max-w-content mx-auto px-6 py-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            기록 아카이브
          </h2>
          <div className="flex flex-col">
            {recordsByStage.map((stage) => (
              <Link
                key={stage.stageId ?? "no-stage"}
                to={stage.stageSlug ? `/journey/${stage.stageSlug}` : "/journey"}
                className="flex justify-between items-center border-b border-border py-3 no-underline hover:bg-surface-secondary transition-colors"
              >
                <span className="text-text-primary font-medium">
                  {stage.stageName ?? "Stage 없음"}
                </span>
                <span className="text-meta text-text-secondary">
                  {stage.count}개의 기록
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* [COLLAB_DISABLED] collaboration section removed */}
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">러너를 찾을 수 없습니다</p>
      <Link to="/learners" className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">목록으로</Link>
    </div>
  );
}
