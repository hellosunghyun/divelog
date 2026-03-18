import type { Route } from "./+types/$learnerSlug";
import { useRouteLoaderData } from "react-router";
import { Link } from "~/components/content/SmartLink";
import SceneCard from "~/components/cards/SceneCard";
import QuestionCard from "~/components/cards/QuestionCard";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
// [COLLAB_DISABLED] import CollaborationUnitCard from "~/components/cards/CollaborationUnitCard";
import EmptyState from "~/components/feedback/EmptyState";
import { cn } from "~/lib/utils/cn";
import { useState } from "react";

export { loader } from "./$learnerSlug.server";

type LoaderData = Awaited<ReturnType<typeof import("./$learnerSlug.server").loader>>;
type PublicLoaderData = Awaited<ReturnType<typeof import("../../_public").loader>>;

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

type TabKey = "records" | "questions";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const key = params.learnerSlug ?? "";
  const cached = getCached<LoaderData>(key);
  if (cached) return cached;
  const loaderData = await serverLoader();
  setCached(key, loaderData);
  return loaderData;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "러너 — DiveLog" }];
  const typedData = loaderData as LoaderData;
  return [{ title: `${typedData.learner.displayName} — DiveLog` }];
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
  const typedData = loaderData as LoaderData;
  const learner = typedData.learner;
  const learnerRecords = typedData.learnerRecords;
  const learnerQuestions = typedData.learnerQuestions;
  const learnerSentences = typedData.learnerSentences;
  const participatedRecords = typedData.participatedRecords ?? [];
  const mentionedRecords = typedData.mentionedRecords ?? [];
  const participantsByRecordId = typedData.participantsByRecordId ?? {};
  const publicData = useRouteLoaderData<PublicLoaderData>("routes/_public");
  const [activeTab, setActiveTab] = useState<TabKey>("records");
  const authData = publicData as { isAuthenticated?: boolean; user?: { id: string } } | undefined;
  const isOwnProfile = authData?.user?.id === learner.userId;
  const visibleParticipatedRecords = isOwnProfile
    ? participatedRecords
    : participatedRecords.filter(({ record }) => record.visibility === "public");
  const visibleMentionedRecords = isOwnProfile
    ? mentionedRecords
    : mentionedRecords.filter(({ record }) => record.visibility === "public");

  const tabItems: { key: TabKey; label: string; count: number }[] = [
    { key: "records", label: "기록", count: learnerRecords.length },
    { key: "questions", label: "질문", count: learnerQuestions.length },
  ];

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-b from-mist-blue/60 via-mist-blue/30 to-bg -mt-15 sm:-mt-16 pt-[6.75rem] sm:pt-28 md:pt-32 pb-12 md:pb-16">
        <div className="max-w-content mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div>
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
            </div>

            <div className="flex-1">
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
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-content mx-auto px-6 pt-8">
        <div className="flex gap-2 mb-8">
          {tabItems.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} {tab.count}
            </TabButton>
          ))}
        </div>

        {activeTab === "records" && (
          <section key="records">
            {learnerRecords.length === 0 ? (
              <EmptyState variant="records" message="아직 작성한 기록이 없습니다." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {learnerRecords.map((item) => {
                  const { record } = item;
                  return (
                    <div key={record.id}>
                      <SceneCard
                         record={{
                           slug: record.slug,
                           title: record.title,
                           content: record.content,
                           format: record.format as "note" | "article",
                           type: record.type as "personal" | "challenge" | "collaboration",
                           rhythm: record.rhythm ?? undefined,
                           createdAt: record.createdAt,
                           recordedAt: record.recordedAt ?? undefined,
                         }}
                         participants={participantsByRecordId?.[record.id]}
                       />
                    </div>
                  );
                })}
              </div>
            )}

            {visibleParticipatedRecords.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-semibold tracking-tight text-text-primary mb-6">
                  함께한 기록
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleParticipatedRecords.map(({ record, author, participantRole, participantAddedAt }) => (
                    <div key={`${record.id}-${participantRole}-${participantAddedAt}`}>
                       <SceneCard
                         record={{
                           slug: record.slug,
                           title: record.title,
                           content: record.content,
                           format: record.format as "note" | "article",
                           type: record.type as "personal" | "challenge" | "collaboration",
                           rhythm: record.rhythm ?? undefined,
                           createdAt: record.createdAt,
                           updatedAt: record.updatedAt ?? undefined,
                           recordedAt: record.recordedAt ?? undefined,
                         }}
                         author={author?.displayName ? {
                           displayName: author.displayName,
                           slug: author.slug ?? "",
                         } : undefined}
                         participants={participantsByRecordId?.[record.id]}
                       />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {visibleMentionedRecords.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-semibold tracking-tight text-text-primary mb-6">
                  언급된 기록
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleMentionedRecords.map(({ record, author, mentionedAt }) => (
                    <div key={`${record.id}-${mentionedAt}`}>
                       <SceneCard
                         record={{
                           slug: record.slug,
                           title: record.title,
                           content: record.content,
                           format: record.format as "note" | "article",
                           type: record.type as "personal" | "challenge" | "collaboration",
                           rhythm: record.rhythm ?? undefined,
                           createdAt: record.createdAt,
                           updatedAt: record.updatedAt ?? undefined,
                           recordedAt: record.recordedAt ?? undefined,
                         }}
                         author={author?.displayName ? {
                           displayName: author.displayName,
                           slug: author.slug ?? "",
                         } : undefined}
                       />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}

        {activeTab === "questions" && (
          <section key="questions">
            {learnerQuestions.length === 0 ? (
              <EmptyState variant="generic" message="아직 남긴 질문이 없습니다." />
            ) : (
              <div className="flex flex-col gap-5">
                {learnerQuestions.map((item) => {
                  const { question, recordSlug, recordTitle } = item;
                  return (
                    <div key={question.id}>
                      <QuestionCard
                        question={question}
                        record={recordSlug && recordTitle ? { slug: recordSlug, title: recordTitle } : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {learnerSentences.length > 0 && (
        <section className="max-w-content mx-auto px-6 py-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            남겨둔 문장들
          </h2>
          <div className="flex flex-col gap-5">
            {learnerSentences.map((item) => {
              const { sentence } = item;
              return (
                <div key={sentence.id}>
                  <HighlightedSentenceCard sentence={sentence} />
                </div>
              );
            })}
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
