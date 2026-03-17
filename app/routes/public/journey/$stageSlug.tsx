import type { Route } from "./+types/$stageSlug";
import { Link } from "~/components/content/SmartLink";
import HeroSection from "~/components/sections/HeroSection";
import SceneCard from "~/components/cards/SceneCard";
import QuestionCard from "~/components/cards/QuestionCard";
// [COLLAB_DISABLED] import CollaborationUnitCard from "~/components/cards/CollaborationUnitCard";
import EmptyState from "~/components/feedback/EmptyState";
import StageStrip from "~/components/sections/StageStrip";

export { loader } from "./$stageSlug.server";

type LoaderData = Awaited<ReturnType<typeof import("./$stageSlug.server").loader>>;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 50;

type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  // Evict oldest entry if at max size
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const key = params.stageSlug ?? "";
  const cached = getCached<LoaderData>(key);
  if (cached) return cached;
  const data = await serverLoader();
  setCached(key, data);
  return data;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Stage — DiveLog" }];
  }
  const typedData = loaderData as LoaderData;
  return [
    { title: `${typedData.stage.name} — DiveLog` },
    {
      name: "description",
      content: typedData.stage.description ?? `${typedData.stage.name} Stage의 기록들`,
    },
  ];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export default function StageDetailPage({ loaderData }: Route.ComponentProps) {
  const { stage, allStages, stageRecords, stageQuestions, stageCollaborations, collectiveMemory } = loaderData as LoaderData;

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

        {/* [COLLAB_DISABLED] collaboration section removed */}

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
