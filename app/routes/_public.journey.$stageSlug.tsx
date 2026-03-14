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

      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <StageStrip stages={allStages} currentStageSlug={stage.slug} />
      </div>

      <div
        style={{
          maxWidth: "var(--max-content-width)",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-4)",
        }}
      >
        {/* Quiet Check-in — text description only, NO charts/numbers */}
        {stage.heroContent && (
          <section
            style={{
              marginBottom: "var(--space-12)",
              padding: "var(--space-8)",
              backgroundColor: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-tertiary)",
                marginBottom: "var(--space-3)",
              }}
            >
              이 Stage의 탐구
            </p>
            <p
              style={{
                fontSize: "var(--font-size-lg)",
                color: "var(--color-text-primary)",
                lineHeight: "var(--line-height-relaxed)",
                fontStyle: "italic",
              }}
            >
              {stage.heroContent}
            </p>
          </section>
        )}

        {stageQuestions.length > 0 && (
          <section style={{ marginBottom: "var(--space-12)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                marginBottom: "var(--space-6)",
              }}
            >
              이 Stage의 열린 질문들
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
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

        <section style={{ marginBottom: "var(--space-12)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            협업
          </h2>
          {stageCollaborations.length === 0 ? (
            <div
              style={{
                padding: "var(--space-8)",
                backgroundColor: "var(--color-surface)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--color-text-secondary)" }}>
                이 Stage는 개인 탐색 중심으로 진행됩니다.
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-tertiary)",
                  marginTop: "var(--space-2)",
                }}
              >
                혼자서 탐구하는 것도 충분한 탐구입니다.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {stageCollaborations.map((unit) => (
                <CollaborationUnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-6)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
              }}
            >
              기록
            </h2>
            <Link
              to={`/logs?stage=${stage.id}`}
              style={{ fontSize: "14px", color: "var(--color-text-tertiary)" }}
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
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
    <div style={{ textAlign: "center", padding: "64px 16px" }}>
      <p
        style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "var(--color-text-primary)",
        }}
      >
        Stage를 찾을 수 없습니다
      </p>
      <p
        style={{
          marginTop: "8px",
          color: "var(--color-text-secondary)",
        }}
      >
        요청하신 Stage가 존재하지 않습니다.
      </p>
      <Link
        to="/journey"
        style={{
          marginTop: "16px",
          display: "inline-block",
          padding: "10px 20px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-ocean-blue)",
          color: "white",
        }}
      >
        여정으로 돌아가기
      </Link>
    </div>
  );
}
