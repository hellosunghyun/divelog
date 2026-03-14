import { data } from "react-router";
import type { Route } from "./+types/_public.groups.$groupSlug";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { collaborationUnits, collaborationMembers, learnerProfiles, records } from "../db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import LearnerCard from "../components/LearnerCard";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { groupSlug } = params;
  const database = db(context.cloudflare.env.DB);

  const unitResult = await database
    .select()
    .from(collaborationUnits)
    .where(eq(collaborationUnits.slug, groupSlug))
    .limit(1);
  const unit = unitResult[0];

  if (!unit) {
    throw data("협업 단위를 찾을 수 없습니다", { status: 404 });
  }

  const [members, unitRecords] = await database.batch([
    database
      .select({ member: collaborationMembers, learner: learnerProfiles })
      .from(collaborationMembers)
      .leftJoin(learnerProfiles, eq(collaborationMembers.learnerId, learnerProfiles.userId))
      .where(eq(collaborationMembers.unitId, unit.id)),
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
      .where(and(eq(records.collaborationUnitId, unit.id), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(records.createdAt))
      .limit(12),
  ]);

  return { unit, members, unitRecords };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "협업 — divelog" }];
  }
  return [{ title: `${loaderData.unit.name} — divelog` }];
}

const STATUS: Record<string, string> = {
  forming: "구성 중",
  active: "탐구 중",
  restructured: "재편성됨",
  archived: "아카이브",
};

export default function GroupDetailPage({ loaderData }: Route.ComponentProps) {
  const { unit, members, unitRecords } = loaderData;

  return (
    <div>
      <HeroSection
        variant="learner"
        title={unit.name}
        subtitle={unit.description ?? undefined}
        badge={STATUS[unit.status] ?? unit.status}
      >
        {unit.currentQuestion && (
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--color-ocean-blue)",
              fontStyle: "italic",
            }}
          >
            "{unit.currentQuestion}"
          </p>
        )}
      </HeroSection>

      <div
        style={{
          maxWidth: "var(--max-content-width)",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-4)",
        }}
      >
        <section style={{ marginBottom: "var(--space-12)" }}>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            팀원
          </h2>
          {members.length === 0 ? (
            <EmptyState variant="learners" message="팀원 정보가 없습니다." />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {members.map(({ learner }) =>
                learner ? <LearnerCard key={learner.userId} learner={learner} /> : null
              )}
            </div>
          )}
        </section>

        <section>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            기록
          </h2>
          {unitRecords.length === 0 ? (
            <EmptyState variant="records" />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {unitRecords.map(({ record, author }) => (
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
        협업 단위를 찾을 수 없습니다
      </p>
      <Link
        to="/"
        style={{
          marginTop: "16px",
          display: "inline-block",
          padding: "10px 20px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-ocean-blue)",
          color: "white",
        }}
      >
        홈으로
      </Link>
    </div>
  );
}
