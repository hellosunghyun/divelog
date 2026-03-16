import { data } from "react-router";
import type { Route } from "./+types/$groupSlug";
import { Link } from "~/components/SmartLink";
import { db } from "~/db/client.server";
import { collaborationUnits, collaborationMembers, learnerProfiles, records } from "~/db/schema.server";
import { eq, and, desc, sql } from "drizzle-orm";
import SceneCard from "~/components/SceneCard";
import LearnerCard from "~/components/LearnerCard";
import HeroSection from "~/components/HeroSection";
import EmptyState from "~/components/EmptyState";
import { createLogger } from "~/lib/logger.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { groupSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "group_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);

  const unitResult = await database
    .select()
    .from(collaborationUnits)
    .where(eq(collaborationUnits.slug, groupSlug))
    .limit(1);
  const unit = unitResult[0];

  if (!unit) {
    logger.info("not_found", { slug: groupSlug });
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

  logger.info("loader_end");
  return { unit, members, unitRecords };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "협업 — DiveLog" }];
  }
  return [{ title: `${loaderData.unit.name} — DiveLog` }];
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
          <p className="text-lg text-ocean-blue italic">
            "{unit.currentQuestion}"
          </p>
        )}
      </HeroSection>

      <div className="max-w-content mx-auto py-16 px-6 md:py-24">
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            팀원
          </h2>
          {members.length === 0 ? (
            <EmptyState variant="learners" message="팀원 정보가 없습니다." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {members.map(({ learner }) =>
                learner ? <LearnerCard key={learner.userId} learner={learner} /> : null
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            기록
          </h2>
          {unitRecords.length === 0 ? (
            <EmptyState variant="records" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">
        협업 단위를 찾을 수 없습니다
      </p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
      >
        홈으로
      </Link>
    </div>
  );
}
