import type { Route } from "./+types/search";
import { Form, useSearchParams, useNavigation } from "react-router";
import { like, or, desc, eq, and, sql } from "drizzle-orm";
import SceneCard from "~/components/cards/SceneCard";
import LearnerCard from "~/components/cards/LearnerCard";
import HeroSection from "~/components/sections/HeroSection";
import EmptyState from "~/components/feedback/EmptyState";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
import LoadingSkeleton from "~/components/feedback/LoadingSkeleton";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { motion } from "~/lib/motion/motion";
import { staggerContainer, staggerItem } from "~/lib/motion/motion-utils";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "검색 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { records, questions, learnerProfiles, sentences } = await import("~/db/schema.server");
  const { getPlainText } = await import("~/lib/content/content.server");
  const { createLogger } = await import("~/lib/infra/logger.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "search" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const tab = url.searchParams.get("tab") ?? "all";
  logger.info("search_query", { query: q, filters: { tab } });

  if (!q.trim()) {
    logger.info("loader_end");
    return {
      q: "",
      tab,
      results: { records: [], questions: [], learners: [], sentences: [] },
    };
  }

  const pattern = `%${q}%`;
  const database = db(context.cloudflare.env.DB);

   const [foundRecords, foundQuestions, foundLearners, foundSentences] = await database.batch([
     database
       .select({
         record: records,
         author: {
           displayName: learnerProfiles.displayName,
           slug: learnerProfiles.slug,
           profilePhotoUrl: learnerProfiles.profilePhotoUrl,
         },
       })
       .from(records)
       .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
        .where(
          and(
            or(like(records.title, pattern), like(records.contentText, pattern)),
            sql`${records.visibility} IN ('cohort', 'public')`
          )
        )
       .orderBy(desc(records.createdAt))
       .limit(10),
     database
       .select({
         question: questions,
       })
       .from(questions)
       .innerJoin(records, eq(questions.recordId, records.id))
       .where(
         and(
           like(questions.content, pattern),
            sql`${records.visibility} IN ('cohort', 'public')`
         )
       )
       .limit(10),
     database
       .select()
       .from(learnerProfiles)
       .where(like(learnerProfiles.displayName, pattern))
       .limit(10),
     database
       .select({
         sentence: sentences,
       })
       .from(sentences)
       .innerJoin(records, eq(sentences.recordId, records.id))
       .where(
         and(
           like(sentences.content, pattern),
            sql`${records.visibility} IN ('cohort', 'public')`
         )
       )
       .limit(10),
   ]);

  const recordsWithSnippets = foundRecords.map(({ record, author }) => {
    const plainTextContent = getPlainText(record.content, normalizeContentFormat(record.format));

    return {
      record,
      author,
      contentSnippet:
        plainTextContent.substring(0, 120) + (plainTextContent.length > 120 ? "…" : ""),
    };
  });

  logger.info("loader_end");
  return {
    q,
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
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching = navigation.state === "loading";
  const total =
    results.records.length +
    results.questions.length +
    results.learners.length +
    results.sentences.length;

  return (
    <div>
      <HeroSection
        variant="home"
        title="검색"
        subtitle="기록, 질문, 러너, 문장을 검색합니다"
      />

      <div className="max-w-content mx-auto py-12 px-6">
        <Form className="mb-10">
          <div className="relative max-w-2xl mx-auto">
            <label htmlFor="search-query" className="sr-only">
              검색어
            </label>
            <input
              id="search-query"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="기록, 질문, 학습자를 검색하세요"
              className="w-full rounded-full px-6 py-4 text-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:border-ocean-blue shadow-tinted-sm placeholder:text-text-tertiary transition-premium"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-deep-ocean text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-ocean-blue transition-premium active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
            >
              검색
            </button>
          </div>
        </Form>

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
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
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
                <motion.section
                  variants={staggerItem}
                  className="mb-10"
                >
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    기록
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.records.map((item: typeof results.records[number]) => (
                      <motion.div
                        key={item.record.id}
                        variants={staggerItem}
                      >
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
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {(tab === "all" || tab === "learners") && results.learners.length > 0 && (
                <motion.section
                  variants={staggerItem}
                  className="mb-10"
                >
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    러너
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.learners.map((learner: typeof results.learners[number]) => (
                      <motion.div
                        key={learner.userId}
                        variants={staggerItem}
                      >
                        <LearnerCard learner={learner} />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {(tab === "all" || tab === "questions") && results.questions.length > 0 && (
                <motion.section
                  variants={staggerItem}
                  className="mb-10"
                >
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    질문
                  </h2>
                  <div className="flex flex-col gap-4 max-w-2xl">
                    {results.questions.map((questionItem: typeof results.questions[number]) => (
                      <motion.div
                        key={questionItem.question.id}
                        variants={staggerItem}
                        className="p-5 bg-surface rounded-2xl border border-border text-text-primary quiet-depth-card"
                      >
                        <p className="text-base leading-relaxed">{questionItem.question.content}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {(tab === "all" || tab === "sentences") && results.sentences.length > 0 && (
                <motion.section
                  variants={staggerItem}
                  className="mb-10"
                >
                  <h2 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                    문장
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {results.sentences.map((sentenceItem: typeof results.sentences[number]) => (
                      <motion.div
                        key={sentenceItem.sentence.id}
                        variants={staggerItem}
                      >
                        <HighlightedSentenceCard
                          sentence={sentenceItem.sentence}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
