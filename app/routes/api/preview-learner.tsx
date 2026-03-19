import { eq, sql } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/db/client.server";
import { learnerProfiles, stages } from "~/db/schema.server";
import { getOptionalUser } from "~/lib/auth/auth.middleware.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim();

  if (!slug) {
    return Response.json({ error: "slug required" }, { status: 400 });
  }

  const database = db(context.cloudflare.env.DB);

  const selectFields = {
    userId: learnerProfiles.userId,
    slug: learnerProfiles.slug,
    displayName: learnerProfiles.displayName,
    profilePhotoUrl: learnerProfiles.profilePhotoUrl,
    cohort: learnerProfiles.cohort,
    bio: learnerProfiles.bio,
    currentQuestion: learnerProfiles.currentQuestion,
    currentStageId: learnerProfiles.currentStageId,
  };

  let result = await database
    .select(selectFields)
    .from(learnerProfiles)
    .where(eq(learnerProfiles.slug, slug))
    .limit(1);

  if (result.length === 0) {
    result = await database
      .select(selectFields)
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, slug))
      .limit(1);
  }

  const learner = result[0];
  if (!learner) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const auth = await getOptionalUser(request, context);
  const currentUserId = auth?.isAuthenticated ? auth.user.id : null;
  const viewerProfile = currentUserId
    ? await database
        .select({ cohort: learnerProfiles.cohort })
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, currentUserId))
        .limit(1)
    : [];
  const viewerCohort = viewerProfile[0]?.cohort ?? null;
  const canViewCohort = currentUserId === learner.userId || (!!viewerCohort && viewerCohort === learner.cohort);

  let stageName: string | null = null;
  if (learner.currentStageId) {
    const stageResult = await database
      .select({ name: stages.name })
      .from(stages)
      .where(eq(stages.id, learner.currentStageId))
      .limit(1);
    stageName = stageResult[0]?.name ?? null;
  }

  return Response.json({
    slug: learner.slug,
    displayName: learner.displayName,
    profilePhotoUrl: learner.profilePhotoUrl,
    cohort: canViewCohort ? learner.cohort : null,
    bio: learner.bio,
    currentQuestion: learner.currentQuestion,
    stageName,
  }, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
