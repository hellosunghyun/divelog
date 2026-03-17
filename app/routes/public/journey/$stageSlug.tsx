import { data } from "react-router";
import type { Route } from "./+types/$stageSlug";
import { Link } from "~/components/SmartLink";
import { eq, and, desc, sql } from "drizzle-orm";
import HeroSection from "~/components/HeroSection";
import SceneCard from "~/components/SceneCard";
import QuestionCard from "~/components/QuestionCard";
import CollaborationUnitCard from "~/components/CollaborationUnitCard";
import EmptyState from "~/components/EmptyState";
import StageStrip from "~/components/StageStrip";

const cache = new Map<string, unknown>();

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { stages, records, questions, collaborationUnits, learnerProfiles, collectiveMemories } = await import("~/db/schema.server");
  const { createLogger } = await import("~/lib/logger.server");

  const { stageSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "journey_stage_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const { getStageBySlug, getStages } = await import("~/db/queries/stages.server");
  const { getRecords } = await import("~/db/queries/records.server");
  
  const stage = await getStageBySlug(context.cloudflare.env.DB, stageSlug || "");
  if (!stage) {
    logger.info("not_found", { slug: stageSlug });
    throw data("Stage를 찾을 수 없습니다", { status: 404 });
  }

  const allStages = await getStages(context.cloudflare.env.DB);
  
  // existing function: getRecords supports { stage: stage.id }
  const stageRecords = await getRecords(context.cloudflare.env.DB, { stage: stage.id, page: 1 });
  
  // For questions, collaboration, and collectiveMemory, use existing queries or keep batch for ones without explicit functions
  const [stageQuestions, stageCollaborations, collectiveMemoryResult] = await database.batch([
    database
      .select({
        question: questions,
        recordSlug: records.slug,
        recordTitle: records.title,
      })
      .from(questions)
      .leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.stageId, stage.id), eq(questions.isOpen, true), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(questions.createdAt))
      .limit(5),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.stageId, stage.id)),
    database
      .select()
      .from(collectiveMemories)
      .where(and(eq(collectiveMemories.stageId, stage.id), eq(collectiveMemories.status, "published")))
      .limit(1),
  ]);
  const collectiveMemory = collectiveMemoryResult[0] ?? null;

  logger.info("loader_end");
  return { stage, allStages, stageRecords, stageQuestions, stageCollaborations, collectiveMemory };
}

export async function clientLoader({ params, serverLoader }: {
  params: { stageSlug?: string };
  serverLoader: () => Promise<unknown>;
}) {
  const key = params.stageSlug ?? "";
  if (cache.has(key)) return cache.get(key);
  const data = await serverLoader();
  cache.set(key, data);
  return data;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Stage — DiveLog" }];
  }
  const typedData = loaderData as Awaited<ReturnType<typeof loader>>;
  return [
    { title: `${typedData.stage.name} — DiveLog` },
    {
      name: "description",
      content: typedData.stage.description ?? `${typedData.stage.name} Stage의 기록들`,
    },
  ];
}

export default function StageDetailPage({ loaderData }: Route.ComponentProps) {
  const { stage, allStages, stageRecords, stageQuestions, stageCollaborations, collectiveMemory } = loaderData as Awaited<ReturnType<typeof loader>>;

  return (
    <div>
      <HeroSection
        variant="stage"
        title={stage.name}
        subtitle={stage.description ?? undefined}
        accentTone={stage.type}
        badge={stage.isCurrent ? "현재 Stage" : undefined}
      />

      <div className="bg-surface border-b border-border">
        <StageStrip stages={allStages} currentStageSlug={stage.slug} />
      </div>

      <div className="max-w-content mx-auto px-6 py-16 md:py-24">
        {stage.heroContent && (
          <section className="mb-12 p-8 bg-surface rounded-lg border border-border">
            <p className="text-meta text-text-tertiary mb-3">
              이 Stage의 탐구
            </p>
            <p className="text-lg text-text-primary leading-relaxed italic">
              {stage.heroContent}
            </p>
          </section>
        )}

        {stageQuestions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              이 Stage의 열린 질문들
            </h2>
            <div className="flex flex-col gap-5">
              {stageQuestions.map((item: any) => {
                const { question, recordSlug, recordTitle } = item;
                return (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    record={
                      recordSlug && recordTitle
                        ? { slug: recordSlug, title: recordTitle }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            협업
          </h2>
          {stageCollaborations.length === 0 ? (
            <div className="p-8 bg-surface rounded-lg border border-border text-center">
              <p className="text-text-secondary">
                이 Stage는 개인 탐색 중심으로 진행됩니다.
              </p>
              <p className="text-meta text-text-tertiary mt-2">
                혼자서 탐구하는 것도 충분한 탐구입니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stageCollaborations.map((unit: any) => (
                <CollaborationUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight">
              기록
            </h2>
            <Link
              to={`/logs?stage=${stage.id}`}
              className="text-sm text-text-tertiary hover:text-ocean-blue transition-colors no-underline"
            >
              전체 보기 →
            </Link>
          </div>
          {stageRecords.length === 0 ? (
            <EmptyState
              variant="records"
              action={{ label: "이 Stage에 기록하기", href: "/write" }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stageRecords.map((item: any) => {
                const { record, author } = item;
                return (
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
                );
              })}
            </div>
          )}
        </section>

        {collectiveMemory && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
              Collective Memory
            </h2>
            <div className="p-6 bg-surface rounded-2xl border border-border">
              <p className="text-text-secondary mb-4">
                이 Stage의 Collective Memory가 발행되었습니다
              </p>
              <Link
                to={`/memories/${stage.slug}`}
                className="inline-block text-sm font-medium text-ocean-blue hover:text-deep-ocean transition-colors no-underline"
              >
                보러 가기 →
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">
        Stage를 찾을 수 없습니다
      </p>
      <p className="mt-2 text-text-secondary">
        요청하신 Stage가 존재하지 않습니다.
      </p>
      <Link
        to="/journey"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        여정으로 돌아가기
      </Link>
    </div>
  );
}
