import type { Route } from "./+types/_public.challenges._index";
import { Link } from "react-router";
import { db } from "../db/client.server";
import { challenges } from "../db/schema.server";
import { asc } from "drizzle-orm";
import HeroSection from "../components/HeroSection";
import EmptyState from "../components/EmptyState";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "챌린지 — divelog" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const database = db(context.cloudflare.env.DB);
  const allChallenges = await database.select().from(challenges).orderBy(asc(challenges.name));
  return { challenges: allChallenges };
}

const STATUS_LABELS: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  upcoming: "예정",
};

export default function ChallengesPage({ loaderData }: Route.ComponentProps) {
  const { challenges: allChallenges } = loaderData;
  
  return (
    <div>
      <HeroSection variant="challenge" title="챌린지" subtitle="함께 탐구하는 공동의 도전들" />
      <div style={{ maxWidth: "var(--max-content-width)", margin: "0 auto", padding: "var(--space-12) var(--space-4)" }}>
        {allChallenges.length === 0 ? (
          <EmptyState variant="generic" message="아직 진행 중인 챌린지가 없습니다." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {allChallenges.map((challenge) => (
              <Link key={challenge.id} to={`/challenges/${challenge.slug}`} style={{ display: "block", textDecoration: "none", backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", padding: "var(--space-6)", boxShadow: "var(--shadow-sm)" }}>
                {challenge.currentQuestion && (
                  <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-ocean-blue)", fontStyle: "italic", marginBottom: "var(--space-3)" }}>
                    "{challenge.currentQuestion}"
                  </p>
                )}
                <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: challenge.problemDefinition ? "var(--space-2)" : 0 }}>
                  {challenge.name}
                </h2>
                {challenge.problemDefinition && (
                  <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)" }}>
                    {challenge.problemDefinition}
                  </p>
                )}
                <div style={{ marginTop: "var(--space-3)", fontSize: "12px", padding: "2px 8px", borderRadius: "var(--radius-full)", backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)", display: "inline-block" }}>
                  {STATUS_LABELS[challenge.status] ?? challenge.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
