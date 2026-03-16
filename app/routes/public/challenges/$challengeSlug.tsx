import { data } from "react-router";
import type { Route } from "./+types/$challengeSlug";
import { Link } from "react-router";
import { db } from "~/db/client.server";
import { challenges, records, collaborationUnits, learnerProfiles } from "~/db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import CollaborationUnitCard from "~/components/CollaborationUnitCard";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { createLogger } from "~/lib/logger.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { challengeSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "challenge_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  
  const challengeResult = await database.select().from(challenges).where(eq(challenges.slug, challengeSlug)).limit(1);
  const challenge = challengeResult[0];
  if (!challenge) {
    logger.info("not_found", { slug: challengeSlug });
    throw data("챌린지를 찾을 수 없습니다", { status: 404 });
  }
  
  const [challengeRecords, challengeCollabs] = await database.batch([
    database.select({
      record: records,
      author: { displayName: learnerProfiles.displayName, slug: learnerProfiles.slug, profilePhotoUrl: learnerProfiles.profilePhotoUrl },
    }).from(records).leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(and(eq(records.challengeId, challenge.id), sql`${records.visibility} != 'draft'`))
      .orderBy(desc(records.createdAt)).limit(12),
    database.select().from(collaborationUnits).where(eq(collaborationUnits.challengeId, challenge.id)),
  ]);
  
  logger.info("loader_end");
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
          <p className="text-lg text-ocean-blue italic max-w-reading">
            "{challenge.currentQuestion}"
          </p>
        )}
      </HeroSection>
      
      <div className="max-w-content mx-auto py-16 px-6">
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            협업 팀
          </h2>
          {challengeCollabs.length === 0 ? (
            <div className="p-8 bg-surface rounded-lg border border-border text-center">
              <p className="text-text-secondary">이 챌린지는 개인 탐색 중심으로 진행됩니다.</p>
              <p className="text-meta text-text-tertiary mt-2">혼자서의 탐구도 소중한 탐구입니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {challengeCollabs.map((unit) => <CollaborationUnitCard key={unit.id} unit={unit} />)}
            </div>
          )}
        </section>
        
        <section>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            탐구 기록
          </h2>
          {challengeRecords.length === 0 ? (
            <EmptyState variant="records" message="아직 이 챌린지의 기록이 없습니다." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">챌린지를 찾을 수 없습니다</p>
      <Link to="/challenges" className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">목록으로</Link>
    </div>
  );
}
