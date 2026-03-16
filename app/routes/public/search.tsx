import type { Route } from "./+types/search";
import { Form, useSearchParams } from "react-router";
import { db } from "~/db/client.server";
import { records, questions, learnerProfiles, sentences } from "~/db/schema.server";
import { like, or, desc, eq, and, sql } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import LearnerCard from "~/components/LearnerCard";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getPlainText } from "~/lib/content.server";
import { normalizeContentFormat } from "~/lib/editor-extensions";
import { createLogger } from "~/lib/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "검색 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
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
           sql`${records.visibility} != 'draft'`
         )
       )
      .orderBy(desc(records.createdAt))
      .limit(10),
    database.select().from(questions).where(like(questions.content, pattern)).limit(10),
    database
      .select()
      .from(learnerProfiles)
      .where(like(learnerProfiles.displayName, pattern))
      .limit(10),
    database.select().from(sentences).where(like(sentences.content, pattern)).limit(10),
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

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { q, tab, results } = loaderData;
  const [searchParams] = useSearchParams();
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
        <Form className="mb-8 flex gap-3">
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="검색어를 입력하세요..."
            className="flex-1 rounded-lg border-border bg-surface text-text-primary shadow-none placeholder:text-text-tertiary focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20"
          />
          <Button
            type="submit"
            className="h-12 rounded-full bg-deep-ocean px-7 text-[15px] font-medium text-white shadow-sm transition-all hover:bg-ocean-blue hover:shadow-md"
          >
            검색
          </Button>
        </Form>

        {!q ? (
           <EmptyState
             variant="search"
             message="검색어를 입력해서 기록, 질문, 러너를 찾아보세요."
           />
        ) : total === 0 ? (
          <EmptyState variant="search" message={`"${q}"에 대한 결과가 없습니다.`} />
        ) : (
          <div>
            <div className="flex gap-2 mb-8 border-b border-border pb-3">
              {["all", "records", "questions", "learners", "sentences"].map((t) => (
                <a
                  key={t}
                  href={`?q=${encodeURIComponent(q)}&tab=${t}`}
                  className={`px-4 py-2 rounded-full text-sm no-underline transition-colors ${
                    tab === t
                      ? "bg-deep-ocean text-white font-medium"
                      : "text-text-secondary hover:bg-mist-blue/30"
                  }`}
                >
                  {t === "all"
                    ? "전체"
                    : t === "records"
                      ? "기록"
                      : t === "questions"
                        ? "질문"
                        : t === "learners"
                           ? "러너"
                           : "문장"}
                </a>
              ))}
            </div>

            {(tab === "all" || tab === "records") && results.records.length > 0 && (
              <section className="mb-10">
                <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                  기록
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.records.map(({ record, author, contentSnippet }) => (
                    <SceneCard
                      key={record.id}
                      record={{
                        ...record,
                        format: normalizeContentFormat(record.format),
                        type:
                          record.type === "challenge"
                            ? "challenge"
                            : record.type === "collaboration"
                              ? "collaboration"
                              : "personal",
                      }}
                      author={author ?? undefined}
                      contentSnippet={contentSnippet}
                    />
                  ))}
                </div>
              </section>
            )}

             {(tab === "all" || tab === "learners") && results.learners.length > 0 && (
               <section className="mb-10">
                 <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                   러너
                 </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.learners.map((learner) => (
                    <LearnerCard key={learner.userId} learner={learner} />
                  ))}
                </div>
              </section>
            )}

            {(tab === "all" || tab === "questions") && results.questions.length > 0 && (
              <section className="mb-10">
                <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                  질문
                </h3>
                <div className="flex flex-col gap-4">
                  {results.questions.map((q2) => (
                    <p
                      key={q2.id}
                      className="p-5 bg-surface rounded-lg border border-border text-text-primary"
                    >
                      {q2.content}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
