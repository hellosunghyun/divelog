import type { Route } from "./+types/_public.search";
import { Form, useSearchParams } from "react-router";
import { db } from "../db/client.server";
import { records, questions, learnerProfiles, sentences } from "../db/schema.server";
import { like, or, desc, eq, and, sql } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import LearnerCard from "../components/LearnerCard";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "검색 — divelog" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const tab = url.searchParams.get("tab") ?? "all";

  if (!q.trim()) {
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
          or(like(records.title, pattern), like(records.content, pattern)),
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

  return {
    q,
    tab,
    results: {
      records: foundRecords,
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
        subtitle="기록, 질문, Learner, 문장을 검색합니다"
      />

      <div className="max-w-content mx-auto py-8 px-4">
        <Form className="mb-8 flex gap-3">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="검색어를 입력하세요..."
            className="flex-1 rounded-sm border border-border bg-surface px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ocean-blue"
          />
          <button
            type="submit"
            className="bg-ocean-blue text-white rounded-md px-5 py-3 text-base font-medium hover:bg-deep-ocean transition-colors"
          >
            검색
          </button>
        </Form>

        {!q ? (
          <EmptyState
            variant="search"
            message="검색어를 입력해서 기록, 질문, Learner를 찾아보세요."
          />
        ) : total === 0 ? (
          <EmptyState variant="search" message={`"${q}"에 대한 결과가 없습니다.`} />
        ) : (
          <div>
            <div className="flex gap-2 mb-6 border-b border-border pb-2">
              {["all", "records", "questions", "learners", "sentences"].map((t) => (
                <a
                  key={t}
                  href={`?q=${encodeURIComponent(q)}&tab=${t}`}
                  className={`px-3 py-1.5 rounded-full text-meta no-underline ${
                    tab === t
                      ? "bg-ocean-blue text-white"
                      : "bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {t === "all"
                    ? "전체"
                    : t === "records"
                      ? "기록"
                      : t === "questions"
                        ? "질문"
                        : t === "learners"
                          ? "Learner"
                          : "문장"}
                </a>
              ))}
            </div>

            {(tab === "all" || tab === "records") && results.records.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  기록
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.records.map(({ record, author }) => (
                    <SceneCard key={record.id} record={record} author={author ?? undefined} />
                  ))}
                </div>
              </section>
            )}

            {(tab === "all" || tab === "learners") && results.learners.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Learner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.learners.map((learner) => (
                    <LearnerCard key={learner.userId} learner={learner} />
                  ))}
                </div>
              </section>
            )}

            {(tab === "all" || tab === "questions") && results.questions.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  질문
                </h3>
                <div className="flex flex-col gap-3">
                  {results.questions.map((q2) => (
                    <p
                      key={q2.id}
                      className="p-4 bg-surface rounded-md border border-border text-text-primary"
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
