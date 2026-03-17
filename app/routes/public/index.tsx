import type { Route } from "./+types/index";
import { Link } from "~/components/content/SmartLink";
import { eq, desc, and, sql, count } from "drizzle-orm";

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
  const { db } = await import("~/db/client.server");
  const { stages, records, questions, sentences, learnerProfiles } = await import("~/db/schema.server");
  const { getRecentActivity } = await import("~/db/queries/social/activity.server");
  const { createLogger } = await import("~/lib/infra/logger.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "home" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  // D1 batch()에서 slug 같은 동명 컬럼이 있는 JOIN 쿼리는 컬럼 매핑이 꼬이므로
  // JOIN이 있는 쿼리는 별도 실행, 단순 쿼리만 batch로 묶는다
  const [allStages, currentStageResult, openQuestions, spotlightLearners, learnerCountResult] = await database.batch([
    database.select().from(stages).orderBy(stages.order),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
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
      .where(and(eq(questions.isOpen, true), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(questions.createdAt))
      .limit(8),
    database.select().from(learnerProfiles).limit(4),
    database.select({ total: count() }).from(learnerProfiles),
  ]);

  const [recentRecords, recentSentences] = await Promise.all([
    database
      .select({
        id: records.id,
        slug: records.slug,
        title: records.title,
        content: records.content,
        format: records.format,
        type: records.type,
        rhythm: records.rhythm,
        stageId: records.stageId,
        createdAt: records.createdAt,
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
          profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        },
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(sql`${records.visibility} != 'draft'`)
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
      .where(sql`${records.visibility} != 'draft'`)
      .orderBy(desc(sentences.createdAt))
      .limit(4),
  ]);

  const currentStage = currentStageResult[0] ?? null;
  const learnerCount = learnerCountResult[0]?.total ?? 0;

  const recentActivity = await getRecentActivity(context.cloudflare.env.DB, { limit: 8 });

  // Pre-compute plain text snippets and relative times on server to avoid hydration mismatch
  const { getPlainText } = await import("~/lib/content/content.server");
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
  return { allStages, currentStage, recentRecords: recentRecordsWithSnippets, openQuestions: openQuestionsWithTime, recentSentences, spotlightLearners, learnerCount, recentActivity };
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

const TYPE_LABELS: Record<string, string> = {
  personal: "개인",
  challenge: "챌린지",
  collaboration: "협업",
};

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { allStages, currentStage, recentRecords, openQuestions, recentSentences, spotlightLearners, learnerCount, recentActivity } = loaderData;

  return (
    <div>
      <HeroSection
        variant="home"
        title={<>수면 아래, <br /><span className="text-mist-blue/90">기록이 깊어지는 곳</span></>}
        subtitle={<>완성된 글이 아니어도 괜찮습니다.<br />질문을 남기고, 조용히 깊어지는 여정의 아카이브입니다.</>}
        badge="성찰적 다이빙"
      >
        <Link
          to="/journey"
          className="w-full sm:w-auto bg-white text-deep-ocean px-6 sm:px-10 py-4 rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-base shadow-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          <span>여정 보기</span>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
        <Link
          to="/write"
          className="w-full sm:w-auto border border-white/20 bg-white/5 backdrop-blur-xl text-white px-6 sm:px-10 py-4 rounded-full font-bold hover:bg-white/10 transition-all text-base text-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          기록 남기기
        </Link>
      </HeroSection>

      {allStages.length > 0 && (
        <section
          

          className="bg-bg pt-8 pb-12 md:py-16"
          data-testid="journey-timeline-section"
        >
          <div className="max-w-[1200px] mx-auto px-6">
            <div
             
              className="bg-white/60 backdrop-blur-xl rounded-[32px] p-8 border border-white/80 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-ocean-blue/10" aria-hidden="true" />
              <div className="flex flex-col lg:flex-row items-center gap-10">
                <div className="lg:w-1/4">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-ocean-blue/60 block mb-1">코호트 여정</span>
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean mb-3">아홉 달의 여정</h2>
                  {currentStage && (
                    <div className="bg-ocean-blue/5 border border-ocean-blue/10 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-ocean-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        <span className="text-xs font-bold text-ocean-blue">현재 구간</span>
                      </div>
                      <p className="text-[13px] text-text-secondary leading-snug">{currentStage.name}</p>
                    </div>
                  )}
                </div>
                <div className="lg:w-3/4 w-full py-8 px-4 overflow-x-auto">
                  <div className="flex items-start justify-between gap-4 min-w-max relative">
                    <div className="absolute h-0.5 bg-border top-[7px] pointer-events-none z-0" style={{ left: "1rem", right: "2rem" }} aria-hidden="true" />
                    {allStages.map((stage: typeof allStages[number], _index: number) => {
                      const isCurrent = stage.isCurrent || stage.slug === currentStage?.slug;
                      const isPast = currentStage && stage.order < currentStage.order;
                      return (
                        <div key={stage.id}>
                          <Link
                            to={`/journey/${stage.slug}`}
                            className="relative flex flex-col items-center gap-2 z-10 no-underline group"
                          >
                            <div
                              className={`w-4 h-4 rounded-full transition-all ${
                                isCurrent
                                  ? "bg-ocean-blue outline outline-4 outline-ocean-blue/20"
                                  : isPast
                                  ? "bg-border"
                                  : "bg-surface-secondary border-2 border-border"
                              } group-hover:scale-110`}
                              role="img"
                              aria-label={`${stage.name}${isCurrent ? " (현재)" : ""}`}
                            />
                            <span className={`text-xs font-medium whitespace-nowrap ${
                              isCurrent ? "text-ocean-blue font-bold" : "text-text-tertiary"
                            }`}>
                              {stage.name}
                            </span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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
          <ActivityFeed activities={recentActivity} />
        </div>
      </section>

      {currentStage && (
        <section
          

          className="max-w-[1200px] mx-auto px-6 py-16 md:py-24"
          data-testid="questions-section"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <div className="quiet-depth-card p-10 rounded-[40px]">
                <span className="text-ocean-blue font-bold text-xs tracking-[0.2em] uppercase mb-4 block">현재 구간</span>
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-deep-ocean mb-6">{currentStage.name}</h3>
                {currentStage.description && (
                  <p className="text-text-secondary text-[17px] leading-relaxed mb-8 font-normal italic">
                    &ldquo;{currentStage.description}&rdquo;
                  </p>
                )}
                {learnerCount > 0 && (
                  <div className="flex items-center gap-4 pt-8 border-t border-border-subtle">
                    <div className="flex -space-x-3">
                      {spotlightLearners.slice(0, 2).map((l: typeof spotlightLearners[number]) => (
                        l.profilePhotoUrl ? (
                          <img key={l.userId} src={l.profilePhotoUrl} alt={`${l.displayName}의 프로필 사진`} className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                        ) : (
                          <div key={l.userId} className="w-9 h-9 rounded-full border-2 border-white bg-mist-blue flex items-center justify-center text-xs font-bold text-ocean-blue">
                            {l.displayName[0]}
                          </div>
                        )
                      ))}
                      {learnerCount > 2 && (
                        <div className="w-9 h-9 rounded-full border-2 border-white bg-ocean-blue flex items-center justify-center text-xs text-white font-bold">
                          +{learnerCount - 2}
                        </div>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-text-secondary">{learnerCount}명의 러너가 함께 다이빙하는 중</span>
                  </div>
                )}
                <div className="mt-6 pt-6 border-t border-border-subtle">
                  <p className="text-xs text-text-tertiary leading-relaxed">지금은 개인 다이빙 중심입니다. 협업이 시작되면 이곳에 함께 나타납니다.</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-3 text-deep-ocean">
                    <svg className="w-7 h-7 text-ocean-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    이번 구간의 열린 질문들
                  </h2>
                <Link to="/journey" className="text-ocean-blue font-bold hover:underline text-[13px] no-underline">모두 보기</Link>
              </div>
              {openQuestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {openQuestions.map((row: typeof openQuestions[number], idx: number) => (
                    <article
                      key={row.questionId}
                     
                      className="quiet-depth-card p-5 rounded-2xl group cursor-pointer hover:border-ocean-blue/30"
                    >
                      <span className="text-xs font-bold text-ocean-blue tracking-widest mb-2 block">질문 {String(idx + 1).padStart(2, "0")}</span>
                    <p className="text-[15px] font-bold leading-tight group-hover:text-ocean-blue transition-colors text-text-primary">
                      {row.questionContent}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-text-tertiary font-medium">
                        {row.authorDisplayName} • {row.relativeTime}
                      </span>
                      <Link
                        to={row.recordSlug ? `/logs/${row.recordSlug}` : "/logs"}
                        className="text-ocean-blue text-xs font-bold px-4 py-2 rounded-lg border border-ocean-blue/20 hover:bg-ocean-blue hover:text-white transition-all no-underline"
                      >
                        응답하기
                      </Link>
                    </div>
                  </article>
                ))}
                </div>
              ) : (
                <article className="quiet-depth-card p-8 rounded-3xl">
                  <p className="text-base text-text-secondary mb-6">이 구간의 첫 질문을 남겨보세요.</p>
                  <Link
                    to="/write"
                    className="inline-flex items-center gap-2 bg-deep-ocean text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-ocean-blue transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                  >
                    질문 남기기
                  </Link>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

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
                   const stage = row.stageId ? allStages.find((s: typeof allStages[number]) => s.id === row.stageId) : null;
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
                            {TYPE_LABELS[row.type] ?? row.type}
                          </span>
                          {stage && (
                            <Link
                              to={`/journey/${stage.slug}`}
                              className="bg-surface-secondary text-text-secondary text-xs font-semibold px-2.5 py-0.5 rounded-full no-underline hover:text-ocean-blue transition-colors"
                            >
                              {stage.name}
                            </Link>
                          )}
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
