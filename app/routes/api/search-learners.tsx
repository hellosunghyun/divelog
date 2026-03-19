import { eq, sql } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/db/client.server";
import { learnerProfiles } from "~/db/schema.server";
import { getOptionalUser } from "~/lib/auth/auth.middleware.server";
import { createLogger } from "~/lib/infra/logger.server";
import * as Sentry from "@sentry/react-router/cloudflare";

function escapeLikeWildcards(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "api.search-learners" });
  logger.info("loader_start");

  const auth = await getOptionalUser(request, context);
  if (!auth?.isAuthenticated) {
    logger.info("search_unauthenticated");
    return Response.json({ results: [], _auth: false });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const queryLength = q.length;

  logger.info("search_query", { query: q || "(empty)" });

  try {
    const database = db(context.cloudflare.env.DB);
    const currentUserId = auth.user.id;
    const viewerProfile = await database
      .select({ cohort: learnerProfiles.cohort })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, currentUserId))
      .limit(1);
    const viewerCohort = viewerProfile[0]?.cohort ?? null;

    const cohortFilter = viewerCohort
      ? sql`(${learnerProfiles.cohort} = ${viewerCohort} OR ${learnerProfiles.userId} = ${currentUserId})`
      : eq(learnerProfiles.userId, currentUserId);

    const baseQuery = database
      .select({
        id: learnerProfiles.userId,
        slug: learnerProfiles.slug,
        displayName: learnerProfiles.displayName,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      })
      .from(learnerProfiles);

     const results = q.length > 0
       ? await baseQuery.where(sql`(${learnerProfiles.displayName} LIKE ${"%" + escapeLikeWildcards(q) + "%"} OR ${learnerProfiles.slug} LIKE ${"%" + escapeLikeWildcards(q) + "%"}) AND ${cohortFilter}`).limit(8)
       : await baseQuery.where(cohortFilter).limit(8);

    logger.info("search_results", { count: results.length });
    return Response.json({ results });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        type: "api_search_learners",
        route: "api/search-learners",
      },
      extra: {
        queryLength,
      },
    });

    logger.error("search_db_error", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ results: [], _error: true }, { status: 500 });
  }
}
