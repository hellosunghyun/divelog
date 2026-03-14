import type { Route } from "./+types/_public._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { stages, records, questions, sentences, learnerProfiles } from "../db/schema.server";
import { eq, desc, and, sql, count } from "drizzle-orm";
import HeroSection from "../components/HeroSection";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "divelog — ADA Learner 여정 아카이브" },
    { name: "description", content: "ADA Learner의 아홉 달을 기록하는 Journey-first 아카이브" },
    { property: "og:title", content: "divelog" },
    { property: "og:description", content: "ADA Learner의 여정을 함께 기록합니다" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);

  const [allStages, currentStageResult, recentRecords, openQuestions, recentSentences, spotlightLearners, learnerCountResult] = await database.batch([
    database.select().from(stages).orderBy(stages.order),
    database.select().from(stages).where(eq(stages.isCurrent, true)).limit(1),
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
        authorDisplayName: learnerProfiles.displayName,
        authorSlug: learnerProfiles.slug,
        authorProfilePhotoUrl: learnerProfiles.profilePhotoUrl,
      })
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(sql`${records.visibility} != 'draft'`)
      .orderBy(desc(records.createdAt))
      .limit(6),
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
      .limit(6),
    database
      .select({
        sentenceId: sentences.id,
        sentenceContent: sentences.content,
        sentenceReason: sentences.reason,
        savedByDisplayName: learnerProfiles.displayName,
        savedBySlug: learnerProfiles.slug,
        recordSlug: records.slug,
        recordTitle: records.title,
      })
      .from(sentences)
      .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
      .leftJoin(records, eq(sentences.recordId, records.id))
      .orderBy(desc(sentences.createdAt))
      .limit(4),
    database.select().from(learnerProfiles).limit(4),
    database.select({ total: count() }).from(learnerProfiles),
  ]);

  const currentStage = currentStageResult[0] ?? null;
  const learnerCount = learnerCountResult[0]?.total ?? 0;

  return { allStages, currentStage, recentRecords, openQuestions, recentSentences, spotlightLearners, learnerCount };
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp * 1000;
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
  const { allStages, currentStage, recentRecords, openQuestions, recentSentences, spotlightLearners, learnerCount } = loaderData;

  return (
    <div>
      <HeroSection
        variant="home"
        title={<>나를 발견하는 <br /><span className="text-mist-blue/90">성찰적 아카이빙</span></>}
        subtitle="떠다니는 생각의 깊은 곳으로 잠수하여 당신의 여정을 보존하세요. 질문이 머물고 지혜가 서서히 깊어지는 조용한 공간입니다."
        badge="REFLECTIVE ARCHIVING"
      >
        <Link
          to="/journey"
          className="bg-white text-deep-ocean px-10 py-4 rounded-full font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5 text-md shadow-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          <span>여정 시작하기</span>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
        <Link
          to="/logs"
          className="border border-white/20 bg-white/5 backdrop-blur-xl text-white px-10 py-4 rounded-full font-semibold hover:bg-white/10 transition-all text-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          공유된 기록 읽기
        </Link>
      </HeroSection>

      {allStages.length > 0 && (
        <section className="bg-bg pt-8 pb-12" data-testid="journey-timeline-section">
          <div className="max-w-canvas mx-auto px-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-8 border border-white/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-ocean-blue/10" aria-hidden="true" />
              <div className="flex flex-col lg:flex-row items-center gap-10">
                <div className="lg:w-1/4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ocean-blue/60 block mb-1">현재 여정</span>
                  <h2 className="text-xl font-semibold text-deep-ocean mb-3">모든 러너가 함께 걷는 길</h2>
                  {currentStage && (
                    <div className="bg-ocean-blue/5 border border-ocean-blue/10 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-ocean-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        <span className="text-xs font-semibold text-ocean-blue">현재 구간</span>
                      </div>
                      <p className="text-[13px] text-text-secondary leading-snug">{currentStage.name}</p>
                    </div>
                  )}
                </div>
                <div className="lg:w-3/4 w-full relative py-8 px-4 overflow-x-auto">
                  <div className="absolute left-10 right-10 h-0.5 bg-border top-1/2 -translate-y-4" aria-hidden="true" />
                  <div className="flex items-center justify-between gap-4 min-w-max">
                    {allStages.map((stage, index) => {
                      const isCurrent = stage.isCurrent || stage.slug === currentStage?.slug;
                      const isPast = currentStage && stage.order < currentStage.order;
                      return (
                        <Link
                          key={stage.id}
                          to={`/journey/${stage.slug}`}
                          className="flex flex-col items-center gap-2 z-10 no-underline group"
                        >
                          <div
                            className={`w-4 h-4 rounded-full transition-all ${
                              isCurrent
                                ? "bg-ocean-blue ring-4 ring-ocean-blue/20"
                                : isPast
                                ? "bg-border"
                                : "bg-surface-secondary border-2 border-border"
                            } group-hover:scale-110`}
                            role="img"
                            aria-label={`${stage.name}${isCurrent ? " (현재)" : ""}`}
                          />
                          <span className={`text-[11px] font-medium whitespace-nowrap ${
                            isCurrent ? "text-ocean-blue font-semibold" : "text-text-tertiary"
                          }`}>
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
      )}

      {currentStage && openQuestions.length > 0 && (
        <section className="max-w-canvas mx-auto px-6 py-16" data-testid="questions-section">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 sticky top-24">
              <div className="quiet-depth-card p-10 rounded-[40px]">
                <span className="text-ocean-blue font-semibold text-[10px] tracking-[0.2em] uppercase mb-4 block">현재 구간</span>
                <h3 className="text-3xl font-semibold text-deep-ocean mb-6">{currentStage.name}</h3>
                {currentStage.description && (
                  <p className="text-text-secondary text-[17px] leading-relaxed mb-8 font-light italic">
                    &ldquo;{currentStage.description}&rdquo;
                  </p>
                )}
                {learnerCount > 0 && (
                  <div className="flex items-center gap-4 pt-8 border-t border-border-subtle">
                    <div className="flex -space-x-3">
                      {spotlightLearners.slice(0, 2).map((l) => (
                        l.profilePhotoUrl ? (
                          <img key={l.userId} src={l.profilePhotoUrl} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                        ) : (
                          <div key={l.userId} className="w-9 h-9 rounded-full border-2 border-white bg-mist-blue flex items-center justify-center text-xs font-semibold text-ocean-blue">
                            {l.displayName[0]}
                          </div>
                        )
                      ))}
                      {learnerCount > 2 && (
                        <div className="w-9 h-9 rounded-full border-2 border-white bg-ocean-blue flex items-center justify-center text-[9px] text-white font-semibold">
                          +{learnerCount - 2}
                        </div>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-text-secondary">{learnerCount}명의 러너가 잠수 중</span>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-2xl font-semibold flex items-center gap-3 text-deep-ocean">이번 구간의 열린 질문들</h4>
                <Link to="/logs" className="text-ocean-blue font-semibold hover:underline text-[13px] no-underline">모두 보기</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openQuestions.map((row) => (
                  <article
                    key={row.questionId}
                    className="quiet-depth-card p-5 rounded-2xl group cursor-pointer hover:border-ocean-blue/30"
                  >
                    <span className="text-[9px] font-semibold text-ocean-blue tracking-widest mb-2 block uppercase">QUESTION</span>
                    <p className="text-[15px] font-semibold leading-tight group-hover:text-ocean-blue transition-colors text-text-primary">
                      {row.questionContent}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-text-tertiary font-medium">
                        {row.authorDisplayName} • {formatRelativeTime(row.questionCreatedAt)}
                      </span>
                      <Link
                        to={row.recordSlug ? `/logs/${row.recordSlug}` : "/logs"}
                        className="text-ocean-blue text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-ocean-blue/20 hover:bg-ocean-blue/5 no-underline"
                      >
                        답변하기
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-surface-secondary/50 py-24 border-y border-border-subtle" data-testid="records-section">
        <div className="max-w-canvas mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.3em] text-ocean-blue/50 mb-2 block uppercase">최근 기록</span>
              <h2 className="text-3xl font-semibold text-deep-ocean">코호트 아카이브: 최근의 기록들</h2>
              <p className="text-text-secondary mt-2 text-md font-light">러너들이 깊은 곳에서 건져 올린 새로운 성찰 조각들.</p>
            </div>
          </div>
          {recentRecords.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentRecords.map((row) => {
                  const snippet = row.content.substring(0, 120) + (row.content.length > 120 ? "…" : "");
                  const initial = row.authorDisplayName ? row.authorDisplayName[0] : "?";
                  return (
                    <article
                      key={row.id}
                      className="quiet-depth-card p-7 rounded-[28px] flex flex-col min-h-[320px]"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <span className="bg-ocean-blue/10 text-ocean-blue text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          {FORMAT_LABELS[row.format] ?? row.format}
                        </span>
                        <span className="text-[11px] text-text-tertiary font-medium">{formatRelativeTime(row.createdAt)}</span>
                      </div>
                      <Link to={`/logs/${row.slug}`} className="no-underline group">
                        <h3 className="text-lg font-semibold mb-3 leading-tight text-deep-ocean line-clamp-2 group-hover:text-ocean-blue transition-colors">
                          {row.title}
                        </h3>
                      </Link>
                      <p className="text-text-secondary text-[14px] font-light leading-relaxed mb-6 flex-grow line-clamp-4">{snippet}</p>
                      <div className="pt-5 border-t border-border-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {row.authorProfilePhotoUrl ? (
                            <img
                              src={row.authorProfilePhotoUrl}
                              alt={row.authorDisplayName ?? ""}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-mist-blue flex items-center justify-center text-[10px] font-semibold text-ocean-blue">
                              {initial}
                            </div>
                          )}
                          <Link
                            to={row.authorSlug ? `/learners/${row.authorSlug}` : "#"}
                            className="text-[12px] font-semibold text-text-secondary no-underline hover:text-ocean-blue transition-colors"
                          >
                            {row.authorDisplayName ?? "익명"}
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
                  className="bg-white border border-border px-8 py-3 rounded-full text-sm font-semibold text-text-secondary hover:border-ocean-blue hover:text-ocean-blue transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                >
                  더 많은 기록 탐색하기
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary mb-6">아직 공개된 기록이 없습니다.</p>
              <Link
                to="/write"
                className="bg-white border border-border px-8 py-3 rounded-full text-sm font-semibold text-text-secondary hover:border-ocean-blue hover:text-ocean-blue transition-all no-underline"
              >
                첫 기록 남기기
              </Link>
            </div>
          )}
        </div>
      </section>

      {recentSentences.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-24 text-center" data-testid="sentence-section">
          <svg className="w-12 h-12 mx-auto text-ocean-blue/20 mb-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
          </svg>
          <blockquote className="text-2xl md:text-[38px] font-light italic leading-[1.2] text-deep-ocean tracking-tight">
            "{recentSentences[0].sentenceContent}"
          </blockquote>
          <div className="flex items-center justify-center gap-6 mt-10">
            <div className="h-px w-12 bg-ocean-blue/20" aria-hidden="true" />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-ocean-blue/50">
              {recentSentences[0].savedByDisplayName ?? "익명"}
            </span>
            <div className="h-px w-12 bg-ocean-blue/20" aria-hidden="true" />
          </div>
        </section>
      )}

      {spotlightLearners.length > 0 && (
        <section className="max-w-canvas mx-auto px-6 py-24 border-t border-border-subtle" data-testid="learners-section">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.3em] text-ocean-blue/50 mb-2 block uppercase">LEARNER SPOTLIGHT</span>
              <h2 className="text-3xl font-semibold text-deep-ocean">함께 잠수하는 러너들</h2>
            </div>
            <Link to="/learners" className="text-ocean-blue font-semibold hover:underline text-[13px] no-underline">전체 러너 보기</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {spotlightLearners.map((learner) => (
              <article
                key={learner.userId}
                className="quiet-depth-card p-6 rounded-2xl flex flex-col hover:bg-white transition-all"
              >
                <div className="flex items-center gap-3 mb-6">
                  {learner.profilePhotoUrl ? (
                    <img
                      src={learner.profilePhotoUrl}
                      alt={learner.displayName}
                      className="w-11 h-11 rounded-xl object-cover border border-white shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-mist-blue flex items-center justify-center text-md font-semibold text-ocean-blue border border-white shrink-0">
                      {learner.displayName[0]}
                    </div>
                  )}
                  <div>
                    <Link
                      to={`/learners/${learner.slug}`}
                      className="font-semibold text-md text-deep-ocean leading-none mb-1.5 no-underline hover:text-ocean-blue transition-colors"
                    >
                      {learner.displayName}
                    </Link>
                    <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">러너</p>
                  </div>
                </div>
                {learner.currentQuestion && (
                  <div className="mt-auto">
                    <p className="text-[12px] font-medium italic text-text-secondary leading-relaxed line-clamp-2">"{learner.currentQuestion}"</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
