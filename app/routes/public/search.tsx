import type { Route } from "./+types/search";
import { Form, useSearchParams } from "react-router";
import { db } from "~/db/client.server";
import { records, learnerProfiles } from "~/db/schema.server";
import { like, or, desc, eq, and, sql } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import LearnerCard from "~/components/LearnerCard";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import QuestionCard from "~/components/QuestionCard";
import { Link } from "~/components/SmartLink";
import { searchQuestions } from "~/db/queries/search.server";
import { getPlainText } from "~/lib/content.server";
import { normalizeContentFormat } from "~/lib/editor-extensions";
import { createLogger } from "~/lib/logger.server";

const tabs = [
  { value: "records", label: "기록" },
  { value: "questions", label: "질문" },
  { value: "learners", label: "러너" },
] as const;

type SearchTab = (typeof tabs)[number]["value"];
type RecordSearchResult = typeof records.$inferSelect;
type LearnerSearchResult = typeof learnerProfiles.$inferSelect;
type QuestionSearchResult = Awaited<ReturnType<typeof searchQuestions>>[number];
type RecordSearchItem = {
  record: RecordSearchResult;
  author: {
    displayName: string | null;
    slug: string | null;
    profilePhotoUrl: string | null;
  } | null;
};
type RecordSearchItemWithSnippet = RecordSearchItem & { contentSnippet: string };

function isSearchTab(value: string | null): value is SearchTab {
  return tabs.some((tab) => tab.value === value);
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "검색 — DiveLog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "search" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const requestedTab = url.searchParams.get("tab");
  const tab = isSearchTab(requestedTab) ? requestedTab : "records";
  logger.info("search_query", { query: q, filters: { tab } });

  if (!q.trim()) {
    logger.info("loader_end");
    return {
      q: "",
      tab,
      results: { records: [], questions: [], learners: [] },
    };
  }

  const pattern = `%${q}%`;
  const database = db(context.cloudflare.env.DB);

  const [foundQuestions, [foundRecords, foundLearners]] = await Promise.all([
    searchQuestions(context.cloudflare.env.DB, q),
    database.batch([
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
            sql`${records.visibility} != 'draft'`,
          ),
        )
        .orderBy(desc(records.createdAt))
        .limit(10),
      database
        .select()
        .from(learnerProfiles)
        .where(like(learnerProfiles.displayName, pattern))
        .limit(10),
    ]),
  ]);

  const recordsWithSnippets = foundRecords.map(({ record, author }: RecordSearchItem) => {
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
    },
  };
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { q, results } = loaderData;
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = isSearchTab(tabParam) ? tabParam : "records";
  const recordResults = results.records as RecordSearchItemWithSnippet[];
  const questionResults = results.questions as QuestionSearchResult[];
  const learnerResults = results.learners as LearnerSearchResult[];
  const total = recordResults.length + questionResults.length + learnerResults.length;

  const buildTabHref = (nextTab: SearchTab) => {
    const params = new URLSearchParams();
    params.set("tab", nextTab);

    if (q) {
      params.set("q", q);
    }

    return `/search?${params.toString()}`;
  };

  return (
    <div>
      <HeroSection
        variant="home"
        title="검색"
        subtitle="기록, 질문, 러너를 검색합니다"
      />

      <div className="max-w-content mx-auto py-12 px-6">
        <Form className="mb-8 flex gap-3">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="검색어를 입력하세요..."
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          />
          <button
            type="submit"
            className="rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            검색
          </button>
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
              {tabs.map((currentTab) => (
                <Link
                  key={currentTab.value}
                  to={buildTabHref(currentTab.value)}
                  prefetch="intent"
                  data-testid={`search-tab-trigger-${currentTab.value}`}
                  className={`px-4 py-2 rounded-full text-sm no-underline transition-colors ${
                    tab === currentTab.value
                      ? "bg-deep-ocean text-white font-medium"
                      : "text-text-secondary hover:bg-mist-blue/30"
                  }`}
                >
                  {currentTab.label}
                </Link>
              ))}
            </div>

            {tab === "records" && (
              <section className="mb-10" data-testid="search-tab-records-panel">
                <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                  기록
                </h3>
                {recordResults.length === 0 ? (
                  <EmptyState variant="search" message="검색 결과가 없습니다." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {recordResults.map(({ record, author, contentSnippet }: RecordSearchItemWithSnippet) => (
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
                        author={
                          author?.displayName && author.slug
                            ? { displayName: author.displayName, slug: author.slug }
                            : undefined
                        }
                        contentSnippet={contentSnippet}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "questions" && (
              <section className="mb-10">
                <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                  질문
                </h3>
                <div className="flex flex-col gap-5" data-testid="search-tab-questions">
                  {questionResults.length === 0 ? (
                    <EmptyState variant="search" message="검색 결과가 없습니다." />
                  ) : (
                    questionResults.map((question: QuestionSearchResult) => {
                      const cardQuestion = { ...question, recordSlug: undefined };

                      return (
                        <Link
                          key={question.id}
                          to={`/logs/${question.recordSlug}`}
                          prefetch="intent"
                          className="no-underline"
                        >
                          <QuestionCard question={cardQuestion} />
                        </Link>
                      );
                    })
                  )}
                </div>
               </section>
            )}

            {tab === "learners" && (
              <section className="mb-10">
                <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-6">
                  러너
                </h3>
                {learnerResults.length === 0 ? (
                  <EmptyState variant="search" message="검색 결과가 없습니다." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {learnerResults.map((learner: LearnerSearchResult) => (
                      <LearnerCard key={learner.userId} learner={learner} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
