import { data } from "react-router";
import type { Route } from "./+types/_public.journey.$stageSlug";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { stages, records, questions, collaborationUnits, learnerProfiles } from "../db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import HeroSection from "../components/HeroSection";
import SceneCard from "../components/SceneCard";
import QuestionCard from "../components/QuestionCard";
import CollaborationUnitCard from "../components/CollaborationUnitCard";
import EmptyState from "../components/EmptyState";
import StageStrip from "../components/StageStrip";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { stageSlug } = params;
  const database = db(context.cloudflare.env.DB);

  const [stageResult, allStages] = await database.batch([
    database.select().from(stages).where(eq(stages.slug, stageSlug)).limit(1),
    database.select().from(stages).orderBy(sql`"order" ASC`),
  ]);

  const stage = stageResult[0];
  if (!stage) {
    throw data("Stage를 찾을 수 없습니다", { status: 404 });
  }

  const [stageRecords, stageQuestions, stageCollaborations] = await database.batch([
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
      .where(and(eq(records.stageId, stage.id), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(records.createdAt))
      .limit(12),
    database
      .select({
        question: questions,
        recordSlug: records.slug,
        recordTitle: records.title,
      })
      .from(questions)
      .leftJoin(records, eq(questions.recordId, records.id))
      .where(and(eq(records.stageId, stage.id), eq(questions.isOpen, true)))
      .orderBy(desc(questions.createdAt))
      .limit(5),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.stageId, stage.id)),
  ]);

  return { stage, allStages, stageRecords, stageQuestions, stageCollaborations };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Stage — divelog" }];
  }
  return [
    { title: `${loaderData.stage.name} — divelog` },
    {
      name: "description",
      content: loaderData.stage.description ?? `${loaderData.stage.name} Stage의 기록들`,
    },
  ];
}

export default function StageDetailPage({ loaderData }: Route.ComponentProps) {
  const { stage, allStages, stageRecords, stageQuestions, stageCollaborations } = loaderData;

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

      <div className="max-w-content mx-auto px-4 py-12 md:py-20">
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
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              이 Stage의 열린 질문들
            </h2>
            <div className="flex flex-col gap-4">
              {stageQuestions.map(({ question, recordSlug, recordTitle }) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  record={
                    recordSlug && recordTitle
                      ? { slug: recordSlug, title: recordTitle }
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary mb-6">
            협업
          </h2>
          {stageCollaborations.length === 0 ? (
            <div className="p-8 bg-surface rounded-lg border border-border text-center">
              <p className="text-text-secondary">
                이 Stage는 개인 탐색 중심으로 진행됩니다.
              </p>
              <p className="text-meta text-text-tertiary mt-2">
                혼자서 탐구하는 것도 충분한 탐구입니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stageCollaborations.map((unit) => (
                <CollaborationUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">
              기록
            </h2>
            <Link
              to={`/logs?stage=${stage.id}`}
              className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stageRecords.map(({ record, author }) => (
                <SceneCard key={record.id} record={record} author={author ?? undefined} />
              ))}
            </div>
          )}
        </section>
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
        className="mt-4 inline-block px-5 py-2.5 rounded-md bg-ocean-blue text-white font-medium hover:bg-deep-ocean transition-colors"
      >
        여정으로 돌아가기
      </Link>
    </div>
  );
}
