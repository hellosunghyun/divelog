import { data } from "react-router";
import type { Route } from "./+types/_public.challenges.$challengeSlug";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { challenges, records, collaborationUnits, learnerProfiles } from "../db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "../components/SceneCard";
import CollaborationUnitCard from "../components/CollaborationUnitCard";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { challengeSlug } = params;
  const database = db(context.cloudflare.env.DB);
  
  const challengeResult = await database.select().from(challenges).where(eq(challenges.slug, challengeSlug)).limit(1);
  const challenge = challengeResult[0];
  if (!challenge) throw data("챌린지를 찾을 수 없습니다", { status: 404 });
  
  const [challengeRecords, challengeCollabs] = await database.batch([
    database.select({
      record: records,
      author: { displayName: learnerProfiles.displayName, slug: learnerProfiles.slug, profilePhotoUrl: learnerProfiles.profilePhotoUrl },
    }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(and(eq(records.challengeId, challenge.id), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(records.createdAt)).limit(12),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.challengeId, challenge.id)),
  ]);
  
  return { challenge, challengeRecords, challengeCollabs };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "챌린지 — divelog" }];
  return [{ title: `${loaderData.challenge.name} — divelog` }];
}

export default function ChallengeDetailPage({ loaderData }: Route.ComponentProps) {
  const { challenge, challengeRecords, challengeCollabs } = loaderData;
  
  return (
    <div>
      <HeroSection variant="challenge" title={challenge.name} subtitle={challenge.problemDefinition ?? undefined} accentTone="challenge">
        {challenge.currentQuestion && (
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-ocean-blue)", fontStyle: "italic", maxWidth: "var(--max-reading-width)" }}>
            "{challenge.currentQuestion}"
          </p>
        )}
      </HeroSection>
      
      <div style={{ maxWidth: "var(--max-content-width)", margin: "0 auto", padding: "var(--space-12) var(--space-4)" }}>
        <section style={{ marginBottom: "var(--space-12)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
            협업 팀
          </h2>
          {challengeCollabs.length === 0 ? (
            <div style={{ padding: "var(--space-8)", backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", textAlign: "center" }}>
              <p style={{ color: "var(--color-text-secondary)" }}>이 챌린지는 개인 탐색 중심으로 진행됩니다.</p>
              <p style={{ fontSize: "13px", color: "var(--color-text-tertiary)", marginTop: "var(--space-2)" }}>혼자서의 탐구도 소중한 탐구입니다.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
              {challengeCollabs.map((unit) => <CollaborationUnitCard key={unit.id} unit={unit} />)}
            </div>
          )}
        </section>
        
        <section>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-6)" }}>
            탐구 기록
          </h2>
          {challengeRecords.length === 0 ? (
            <EmptyState variant="records" message="아직 이 챌린지의 기록이 없습니다." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
              {challengeRecords.map(({ record, author }) => <SceneCard key={record.id} record={record} author={author ?? undefined} />)}
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
      <p style={{ fontSize: "20px", fontWeight: "600", color: "var(--color-text-primary)" }}>챌린지를 찾을 수 없습니다</p>
      <Link to="/challenges" style={{ marginTop: "16px", display: "inline-block", padding: "10px 20px", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-ocean-blue)", color: "white" }}>목록으로</Link>
    </div>
  );
}
