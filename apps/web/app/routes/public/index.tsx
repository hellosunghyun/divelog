import type { Route } from "./+types/index";
import { Suspense } from "react";
import { Await } from "react-router";
import { Link } from "~/components/content/SmartLink";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { db } from "~/db/client.server";
import { getStages } from "~/db/queries/journey/stages.server";
import { records, questions, sentences, learnerProfiles } from "~/db/schema.server";
import { getRecentActivity } from "~/db/queries/social/activity.server";
import { RECORD_TYPE_LABELS, type RecordType } from "~/lib/constants/record-types";
import { getPlainText } from "~/lib/content/content.server";
import { createLogger } from "~/lib/infra/logger.server";

import HeroSection from "~/components/sections/HeroSection";
import ActivityFeed from "~/components/activity/ActivityFeed";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "DiveLog — Apple Developer Academy @ POSTECH 러너 여정 아카이브" },
     { name: "description", content: "Apple Developer Academy @ POSTECH 러너의 아홉 달을 기록하는 여정 중심 아카이브" },
     { property: "og:title", content: "DiveLog" },
     { property: "og:description", content: "Apple Developer Academy @ POSTECH 러너의 아홉 달을 기록하는 여정 중심 아카이브" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "home" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  // D1 batch()에서 slug 같은 동명 컬럼이 있는 JOIN 쿼리는 컬럼 매핑이 꼬이므로
  // JOIN이 있는 쿼리는 별도 실행, 단순 쿼리만 batch로 묶는다
  const [openQuestions, spotlightLearners, learnerCountResult] = await database.batch([
    database
      .select({
        questionId: questions.id,
        questionContent: questions.content,
        questionDirection: questions.direction,
        questionIsOpen: questions.isOpen,
        recordSlug: records.slug,
        recordTitle: records.title,
        authorDisplayName: learnerProfiles.displayName,
        questionCreatedAt: questions.createdAt,
      })
      .from(questions)
      .leftJoin(records, eq(questions.recordId, records.id))
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(and(eq(questions.isOpen, true), sql`${records.visibility} IN ('cohort', 'public')`))
      .orderBy(desc(questions.createdAt))
      .limit(8),
    database.select().from(learnerProfiles).limit(4),
    database.select({ total: count() }).from(learnerProfiles),
  ]);

  const learnerCount = learnerCountResult[0]?.total ?? 0;

  const [recentRecords, recentSentences, allStages, recentActivityPromise] = await Promise.all([
    database
      .select({
        id: records.id,
        slug: records.slug,
        title: records.title,
        content: records.content,
        format: records.format,
        type: records.type,
        rhythm: records.rhythm,
        createdAt: records.createdAt,
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
          profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(sql`${records.visibility} IN ('cohort', 'public')`)
      .orderBy(desc(records.createdAt))
      .limit(9),
    database
      .select({
        sentenceId: sentences.id,
        sentenceContent: sentences.content,
        sentenceReason: sentences.reason,
        savedBy: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
        },
        record: {
          slug: records.slug,
          title: records.title,
        },
      })
      .from(sentences)
      .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
      .leftJoin(records, eq(sentences.recordId, records.id))
      .where(sql`${records.visibility} IN ('cohort', 'public')`)
      .orderBy(desc(sentences.createdAt))
      .limit(4),
    getStages(context.cloudflare.env.DB),
    getRecentActivity(context.cloudflare.env.DB, {
      limit: 8,
      cohort: null,
    }),
  ]);

  const currentStage = allStages.find((stage) => stage.isCurrent) ?? null;

  // Pre-compute plain text snippets and relative times on server to avoid hydration mismatch
  const nowMs = Date.now();
  const recentRecordsWithSnippets = recentRecords.map(row => {
    const plainText = getPlainText(row.content ?? "", (row.format === "article" ? "article" : "note") as "note" | "article");
    return {
      ...row,
      snippet: plainText.length > 300 ? plainText.substring(0, 300) : plainText,
      relativeTime: formatRelativeTime(row.createdAt, nowMs),
    };
  });

  const openQuestionsWithTime = openQuestions.map(row => ({
    ...row,
    relativeTime: formatRelativeTime(row.questionCreatedAt, nowMs),
  }));

  logger.info("loader_end");
  return {
    recentRecords: recentRecordsWithSnippets,
    openQuestions: openQuestionsWithTime,
    recentSentences,
    spotlightLearners,
    learnerCount,
    stages: allStages,
    currentStage,
    recentActivity: recentActivityPromise,
  };
}

function formatRelativeTime(timestamp: number | null, nowMs?: number): string {
  if (!timestamp) return "";
  const diff = (nowMs ?? Date.now()) - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

const FORMAT_LABELS: Record<string, string> = {
  note: "노트",
  article: "글",
};

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const {
    recentRecords,
    recentSentences,
    spotlightLearners,
    learnerCount,
    stages,
    currentStage,
  } = loaderData;

  return (
    <div>
      <HeroSection
        variant="home"
        title={<>수면 아래, <br /><span className="text-mist-blue/90">기록이 깊어지는 곳</span></>}
        subtitle={<>완성된 글이 아니어도 괜찮습니다.<br />질문을 남기고, 조용히 깊어지는 여정의 아카이브입니다.</>}
        badge="성찰적 다이빙"
      >
        <Link
          to="/write"
          className="w-full sm:w-auto border border-white/20 bg-white/5 backdrop-blur-xl text-white px-6 sm:px-10 py-4 rounded-full font-bold hover:bg-white/10 transition-all text-base text-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          기록 남기기
        </Link>
      </HeroSection>

      {stages.length > 0 ? (
        <section
          className="bg-bg pt-8 pb-12 md:py-16"
          data-testid="journey-timeline-section"
        >
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 p-8 shadow-sm backdrop-blur-xl">
              <div className="absolute left-0 top-0 h-full w-1.5 bg-ocean-blue/10" aria-hidden="true" />
              <div className="flex flex-col items-center gap-10 lg:flex-row">
                <div className="lg:w-1/4">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-ocean-blue/60">
                    코호트 여정
                  </span>
                  <h2 className="mb-3 text-3xl font-semibold tracking-tight text-deep-ocean md:text-4xl">
                    아홉 달의 여정
                  </h2>
                  {currentStage ? (
                    <div className="rounded-2xl border border-ocean-blue/10 bg-ocean-blue/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-ocean-blue"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        <span className="text-xs font-bold text-ocean-blue">현재 구간</span>
                      </div>
                      <p className="text-[13px] leading-snug text-text-secondary">{currentStage.name}</p>
                    </div>
                  ) : null}
                </div>

                <div className="[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full overflow-x-auto px-4 py-8 lg:w-3/4">
                  <div className="relative flex min-w-max items-start justify-between gap-4">
                    <div
                      className="pointer-events-none absolute top-[7px] z-0 h-0.5 bg-border"
                      style={{ left: "1rem", right: "2rem" }}
                      aria-hidden="true"
                    />
                    {stages.map((stage) => {
                      const isCurrent = Boolean(stage.isCurrent) || stage.slug === currentStage?.slug;
                      const isPast = currentStage ? stage.order < currentStage.order : false;

                      return (
                        <Link
                          key={stage.id}
                          to="/journey"
                          className="relative z-10 flex flex-col items-center gap-2 no-underline group"
                          aria-current={isCurrent ? "page" : undefined}
                        >
                          <div
                            className={[
                              "h-4 w-4 rounded-full transition-all group-hover:scale-110",
                              isCurrent
                                ? "bg-ocean-blue outline outline-4 outline-ocean-blue/20"
                                : isPast
                                  ? "bg-border"
                                  : "border-2 border-border bg-surface-secondary",
                            ].join(" ")}
                            role="img"
                            aria-label={`${stage.name}${isCurrent ? " (현재)" : ""}`}
                          />
                          <span
                            className={[
                              "whitespace-nowrap text-xs font-medium",
                              isCurrent ? "font-bold text-ocean-blue" : "text-text-tertiary",
                            ].join(" ")}
                          >
                            {stage.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section
        

        className="max-w-[1200px] mx-auto px-6 py-16 md:py-24"
        data-testid="activity-section"
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] text-ocean-blue/50 mb-2 block uppercase">여정 활동</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean">여정에서 일어나는 일</h2>
            <p className="text-text-secondary mt-2 text-md font-normal">지난 2주간의 활동 요약</p>
          </div>
        </div>
        <div>
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-surface-secondary rounded-2xl h-24" />
              ))}
            </div>
          }>
            <Await resolve={loaderData.recentActivity}>
              {(recentActivity) => (
                <ActivityFeed activities={recentActivity} />
              )}
            </Await>
          </Suspense>
        </div>
      </section>

      <section
        

        className="bg-surface-secondary/50 py-16 md:py-24 border-y border-border-subtle"
        data-testid="records-section"
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold tracking-[0.3em] text-ocean-blue/50 mb-2 block uppercase">최근 장면</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean">최근 장면들</h2>
              <p className="text-text-secondary mt-2 text-md font-normal">수면 아래에서 남겨진 최근 기록과 질문들</p>
            </div>
          </div>
          {recentRecords.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentRecords.map((row: typeof recentRecords[number]) => {
                   const initial = row.author?.displayName ? row.author.displayName[0] : "?";
                  return (
                    <article
                      key={row.id}
                     
                      className="quiet-depth-card p-7 rounded-[28px] flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-ocean-blue/10 text-ocean-blue text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            {FORMAT_LABELS[row.format] ?? row.format}
                          </span>
                          <span className="bg-mist-blue text-ocean-blue text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {RECORD_TYPE_LABELS[row.type as RecordType] ?? row.type}
                          </span>
                        </div>
                        <span className="text-xs text-text-tertiary font-medium">{row.relativeTime}</span>
                      </div>
                      <Link to={`/logs/${row.slug}`} className="no-underline group">
                        <h3 className="text-lg font-bold mb-3 leading-tight text-deep-ocean line-clamp-2 group-hover:text-ocean-blue transition-colors">
                          {row.title}
                        </h3>
                      </Link>
                      <p className="text-text-secondary text-base font-normal leading-relaxed mb-6 flex-grow line-clamp-4" suppressHydrationWarning>{row.snippet}</p>
                      <div className="pt-5 border-t border-border-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {row.author?.profilePhotoUrl ? (
                            <img
                              src={row.author.profilePhotoUrl}
                              alt={row.author.displayName ?? ""}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-mist-blue flex items-center justify-center text-[10px] font-bold text-ocean-blue">
                              {initial}
                            </div>
                          )}
                          <Link
                            to={row.author?.slug ? `/learners/${row.author.slug}` : "#"}
                            className="text-xs font-bold text-text-secondary no-underline hover:text-ocean-blue transition-colors"
                          >
                            {row.author?.displayName ?? "익명"}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="mt-12 text-center">
                <Link
                  to="/logs"
                  className="bg-white border border-border px-8 py-3 rounded-full text-sm font-bold text-text-secondary hover:border-ocean-blue hover:text-ocean-blue transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                >
                  더 많은 기록 탐색하기
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary mb-6">아직 기록이 시작되지 않았습니다. 완성된 글이 아니어도 괜찮습니다.</p>
              <Link
                to="/write"
                className="bg-white border border-border px-8 py-3 rounded-full text-sm font-bold text-text-secondary hover:border-ocean-blue hover:text-ocean-blue transition-all no-underline"
              >
                첫 기록 남기기
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        

        className="max-w-[1200px] mx-auto px-6 py-16 md:py-24"
        data-testid="sentence-section"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean">남겨둔 문장</h2>
        </div>
        {recentSentences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {recentSentences.map((sentence: typeof recentSentences[number]) => (
              <article
                key={sentence.sentenceId}
               
                className="quiet-depth-card p-6 rounded-2xl flex flex-col"
              >
                <blockquote className="text-xl font-semibold leading-snug text-deep-ocean mb-4">
                  &ldquo;{sentence.sentenceContent}&rdquo;
                </blockquote>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {sentence.sentenceReason ? sentence.sentenceReason : "남긴 이유를 적지 않았습니다."}
                </p>
                <div className="mt-auto pt-4 border-t border-border-subtle flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-tertiary">{sentence.savedBy?.displayName ?? "익명"}</span>
                  <Link
                    to={sentence.record?.slug ? `/logs/${sentence.record.slug}` : "/logs"}
                    className="text-xs font-semibold text-ocean-blue no-underline hover:underline"
                  >
                    원문 보기
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="quiet-depth-card p-8 rounded-3xl text-center">
            <p className="text-base text-text-secondary">아직 남겨둔 문장이 없습니다.</p>
          </article>
        )}
      </section>

      <section
        

        className="max-w-[1200px] mx-auto px-6 py-16 md:py-24 border-t border-border-subtle"
        data-testid="learners-section"
      >
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold tracking-[0.3em] text-ocean-blue/50 mb-2 block uppercase">러너 스포트라이트</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean flex items-center gap-3">
                <svg className="w-9 h-9 text-ocean-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>
                함께 잠수하는 러너들
              </h2>
            </div>
            <Link to="/learners" className="text-ocean-blue font-bold hover:underline text-[13px] no-underline">전체 러너 보기 ({learnerCount})</Link>
          </div>
          {spotlightLearners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {spotlightLearners.map((learner: typeof spotlightLearners[number]) => (
              <article
                key={learner.userId}
               
                className="quiet-depth-card p-6 rounded-2xl flex flex-col hover:bg-white transition-all"
              >
                <div className="mb-6 min-h-[52px]">
                  {learner.currentQuestion ? (
                    <p className="text-sm font-medium italic text-text-secondary leading-relaxed line-clamp-3">&ldquo;{learner.currentQuestion}&rdquo;</p>
                  ) : (
                    <p className="text-sm text-text-tertiary leading-relaxed">현재 질문을 탐색하는 중입니다.</p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-auto">
                  {learner.profilePhotoUrl ? (
                    <img
                      src={learner.profilePhotoUrl}
                      alt={learner.displayName}
                      className="w-11 h-11 rounded-xl object-cover border border-white shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-mist-blue flex items-center justify-center text-md font-bold text-ocean-blue border border-white shrink-0">
                      {learner.displayName[0]}
                    </div>
                  )}
                  <div>
                    <Link
                      to={`/learners/${learner.slug}`}
                      className="font-bold text-md text-deep-ocean leading-none mb-1.5 no-underline hover:text-ocean-blue transition-colors"
                    >
                      {learner.displayName}
                    </Link>
                    <p className="text-xs text-text-tertiary font-medium uppercase tracking-wider">러너</p>
                  </div>
                </div>
              </article>
              ))}
            </div>
          ) : (
            <article className="quiet-depth-card p-8 rounded-3xl text-center">
              <p className="text-base text-text-secondary">아직 소개할 러너가 없습니다.</p>
            </article>
          )}
      </section>

      <section
        

        className="bg-mist-blue/40 py-16 md:py-20 text-center"
        data-testid="start-cta-section"
      >
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean mb-4">더 깊은 곳에서, 기록은 시작됩니다</h2>
          <p className="text-text-secondary text-lg mb-8">완성된 글이 아니어도 괜찮습니다. 지금 떠오른 생각부터 남겨보세요.</p>
          <div>
            <Link
              to="/write"
              className="inline-flex items-center gap-2 bg-deep-ocean text-white px-8 py-3.5 rounded-full text-base font-semibold hover:bg-ocean-blue transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
            >
              기록 남기기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
