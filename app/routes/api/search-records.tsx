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
    return Response.json({ results: [] });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length === 0) {
    return Response.json({ results: [] });
  }

  logger.info("search_query", { query: q });

  const database = db(context.cloudflare.env.DB);
  const pattern = `%${q}%`;

  const results = await database
    .select({
      id: records.id,
      slug: records.slug,
      title: records.title,
      format: records.format,
      authorDisplayName: learnerProfiles.displayName,
    })
    .from(records)
    .leftJoin(learnerProfiles, sql`${records.authorId} = ${learnerProfiles.userId}`)
    .where(
      and(
        sql`${records.visibility} IN ('cohort', 'public')`,
        sql`(${records.title} LIKE ${pattern} OR ${records.contentText} LIKE ${pattern})`,
      ),
    )
    .limit(8);

  return Response.json({ results });
}
