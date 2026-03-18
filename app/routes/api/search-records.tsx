import { sql, and } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/db/client.server";
import { records, learnerProfiles } from "~/db/schema.server";
import { getOptionalUser } from "~/lib/auth/auth.middleware";
import { createLogger } from "~/lib/infra/logger.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "api.search-records" });
  logger.info("loader_start");

  const auth = await getOptionalUser(request, context);
  if (!auth?.isAuthenticated) {
    logger.info("search_unauthenticated");
    return Response.json({ results: [], _auth: false });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const includeOwn = url.searchParams.get("includeOwn") === "true";
  const currentUserId = auth.isAuthenticated ? auth.user.id : null;

  logger.info("search_query", { query: q || "(empty)" });

  try {
    const database = db(context.cloudflare.env.DB);

    const baseQuery = database
      .select({
        id: records.id,
        slug: records.slug,
        title: records.title,
        format: records.format,
        authorDisplayName: learnerProfiles.displayName,
      })
      .from(records)
      .leftJoin(learnerProfiles, sql`${records.authorId} = ${learnerProfiles.userId}`);

    const visibilityFilter = includeOwn && currentUserId
      ? sql`(${records.visibility} IN ('cohort', 'public') OR ${records.authorId} = ${currentUserId})`
      : sql`${records.visibility} IN ('cohort', 'public')`;

    const results = q.length > 0
      ? await baseQuery.where(and(
          visibilityFilter,
          sql`(${records.title} LIKE ${"%" + q + "%"} OR ${records.contentText} LIKE ${"%" + q + "%"})`,
        )).limit(8)
      : await baseQuery.where(visibilityFilter).orderBy(sql`${records.createdAt} DESC`).limit(8);

    logger.info("search_results", { count: results.length });
    return Response.json({ results });
  } catch (error) {
    logger.error("search_db_error", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ results: [], _error: true }, { status: 500 });
  }
}
