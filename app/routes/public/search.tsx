import type { Route } from "./+types/search";
import { useSearchParams, useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { like, or, desc, eq, and, sql } from "drizzle-orm";
import SceneCard from "~/components/cards/SceneCard";
import LearnerCard from "~/components/cards/LearnerCard";
import HeroSection from "~/components/sections/HeroSection";
import EmptyState from "~/components/feedback/EmptyState";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
import LoadingSkeleton from "~/components/feedback/LoadingSkeleton";
import { db } from "~/db/client.server";
import { learnerProfiles, questions, records, sentences } from "~/db/schema.server";
import { getPlainText } from "~/lib/content/content.server";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { createLogger } from "~/lib/infra/logger.server";
import { hangulIncludes } from "~/lib/utils/hangul";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "검색 — DiveLog" }];
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (currentUrl.search !== nextUrl.search) {
    return true;
  }
  return defaultShouldRevalidate;
}

function isJamoQuery(q: string): boolean {
  return /^[ㄱ-ㅎㅏ-ㅣ]+$/.test(q);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "search" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const trimmedQuery = q.trim();
  const tab = url.searchParams.get("tab") ?? "all";
  logger.info("search_query", { query: q, filters: { tab } });

  if (!trimmedQuery) {
    logger.info("loader_end");
    return {
      q: "",
      tab,
      results: { records: [], questions: [], learners: [], sentences: [] },
    };
  }

  const pattern = `%${trimmedQuery}%`;
  const broadFetch = trimmedQuery.length <= 2 || isJamoQuery(trimmedQuery);
  const fetchLimit = broadFetch ? 50 : 10;
  const database = db(context.cloudflare.env.DB);
  const recordVisibilityFilter = sql`${records.visibility} IN ('cohort', 'public')`;
  const learnersQuery = broadFetch
    ? database
        .select()
        .from(learnerProfiles)
        .limit(fetchLimit)
    : database
        .select()
        .from(learnerProfiles)
        .where(like(learnerProfiles.displayName, pattern))
        .limit(fetchLimit);

  const [foundRecordsRaw, foundQuestionsRaw, foundLearnersRaw, foundSentencesRaw] = await database.batch([
    database
      .select()
      .from(records)
      .where(
        broadFetch
          ? recordVisibilityFilter
          : and(
              or(like(records.title, pattern), like(records.contentText, pattern)),
              recordVisibilityFilter
            )
      )
      .orderBy(desc(records.createdAt))
      .limit(fetchLimit),
    database
      .select({
        question: questions,
      })
      .from(questions)
      .innerJoin(records, eq(questions.recordId, records.id))
      .where(
        broadFetch
          ? recordVisibilityFilter
          : and(like(questions.content, pattern), recordVisibilityFilter)
      )
      .limit(fetchLimit),
    learnersQuery,
    database
      .select({
        sentence: sentences,
      })
      .from(sentences)
      .innerJoin(records, eq(sentences.recordId, records.id))
      .where(
        broadFetch
          ? recordVisibilityFilter
          : and(like(sentences.content, pattern), recordVisibilityFilter)
      )
      .limit(fetchLimit),
  ]);

  const foundRecords = foundRecordsRaw
    .filter((record) =>
      hangulIncludes(record.title ?? "", trimmedQuery) ||
      hangulIncludes(record.contentText ?? "", trimmedQuery)
    )
    .slice(0, 10);
  const foundQuestions = foundQuestionsRaw
    .filter((item) => hangulIncludes(item.question.content, trimmedQuery))
    .slice(0, 10);
  const foundLearners = foundLearnersRaw
    .filter((learner) => hangulIncludes(learner.displayName, trimmedQuery))
    .slice(0, 10);
  const foundSentences = foundSentencesRaw
    .filter((item) => hangulIncludes(item.sentence.content, trimmedQuery))
    .slice(0, 10);

  const authorIds = [...new Set(foundRecords.map((r) => r.authorId).filter(Boolean))];
  const authorMap = new Map<string, { displayName: string; slug: string; profilePhotoUrl: string | null }>();
  if (authorIds.length > 0) {
    const authors = await database
      .select({
        userId: learnerProfiles.userId,
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      })
      .from(learnerProfiles)
      .where(sql`${learnerProfiles.userId} IN ${authorIds}`);
    for (const a of authors) {
      authorMap.set(a.userId, { displayName: a.displayName, slug: a.slug, profilePhotoUrl: a.profilePhotoUrl });
    }
  }

  const recordsWithSnippets = foundRecords.map((record) => {
    const plainTextContent = getPlainText(record.content, normalizeContentFormat(record.format));
    const author = authorMap.get(record.authorId) ?? null;

    return {
      record,
      author,
      contentSnippet:
        plainTextContent.substring(0, 120) + (plainTextContent.length > 120 ? "…" : ""),
    };
  });

  logger.info("loader_end");
  return {
    q: trimmedQuery,
    tab,
    results: {
      records: recordsWithSnippets,
      questions: foundQuestions,
      learners: foundLearners,
      sentences: foundSentences,
    },
  };
}

const TABS = [
  { id: "all", label: "전체" },
  { id: "records", label: "기록" },
  { id: "questions", label: "질문" },
  { id: "learners", label: "러너" },
  { id: "sentences", label: "문장" },
] as const;

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { q, tab, results } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isSearching = navigation.state === "loading";
  const total =
    results.records.length +
    results.questions.length +
    results.learners.length +
    results.sentences.length;

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  function handleSearchInput(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      const trimmed = value.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      setSearchParams(params, { replace: true });
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      <HeroSection
        variant="home"
        title="검색"
        subtitle="기록, 질문, 러너, 문장을 검색합니다"
      />

      <div className="max-w-content mx-auto py-12 px-6">
        <div className="mb-10">
          <div className="relative max-w-2xl mx-auto">
            <label htmlFor="search-query" className="sr-only">
              검색어
            </label>
            <input
              id="search-query"
              type="search"
              value={inputValue}
              onChange={(e) => handleSearchInput(e.currentTarget.value)}
              placeholder="기록, 질문, 학습자를 검색하세요"
              className="w-full rounded-full px-6 py-4 text-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:border-ocean-blue shadow-tinted-sm placeholder:text-text-tertiary transition-premium"
            />
          </div>
        </div>

        {isSearching ? (
          <>
            <h2 className="sr-only">검색 결과</h2>
          <LoadingSkeleton variant="card" count={3} />
          </>
        ) : !q ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="sr-only">검색 결과</h2>
            <EmptyState
              variant="search"
              message="검색어를 입력해서 기록, 질문, 러너를 찾아보세요."
            />
          </div>
        ) : total === 0 ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="sr-only">검색 결과</h2>
            <EmptyState variant="search" message={`"${q}"에 대한 결과가 없습니다.`} />
          </div>
        ) : (
          <div>
            <div className="flex justify-center mb-10">
              <div className="inline-flex rounded-full bg-surface-secondary p-1 gap-0.5">
                {TABS.map((t) => (
                  <a
                    key={t.id}
                    href={`?q=${encodeURIComponent(q)}&tab=${t.id}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-premium ${
                      tab === t.id
                        ? "bg-surface shadow-tinted-sm text-text-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {t.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-12">
              {(tab === "all" || tab === "records") && results.records.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    기록
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.records.map((item: typeof results.records[number]) => (
                      <div key={item.record.id}>
                        <SceneCard
                          record={{
                            ...item.record,
                            format: normalizeContentFormat(item.record.format),
                            type:
                              item.record.type === "challenge"
                                ? "challenge"
                                : item.record.type === "collaboration"
                                  ? "collaboration"
                                  : "personal",
                          }}
                          author={item.author ?? undefined}
                          contentSnippet={item.contentSnippet}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(tab === "all" || tab === "learners") && results.learners.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    러너
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.learners.map((learner: typeof results.learners[number]) => (
                      <div key={learner.userId}>
                        <LearnerCard learner={learner} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(tab === "all" || tab === "questions") && results.questions.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    질문
                  </h2>
                  <div className="flex flex-col gap-4 max-w-2xl">
                    {results.questions.map((questionItem: typeof results.questions[number]) => (
                      <div
                        key={questionItem.question.id}
                        className="p-5 bg-surface rounded-2xl border border-border text-text-primary quiet-depth-card"
                      >
                        <p className="text-base leading-relaxed">{questionItem.question.content}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(tab === "all" || tab === "sentences") && results.sentences.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    문장
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {results.sentences.map((sentenceItem: typeof results.sentences[number]) => (
                      <div key={sentenceItem.sentence.id}>
                        <HighlightedSentenceCard
                          sentence={sentenceItem.sentence}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
