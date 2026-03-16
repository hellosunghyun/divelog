import { sql } from "drizzle-orm";
import { db } from "~/db/client.server";
import { learnerProfiles } from "~/db/schema.server";
import { getOptionalUser } from "~/lib/auth.middleware";
import { createLogger } from "~/lib/logger.server";

export async function loader({ request, context }: any) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "api.search-learners" });
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
      id: learnerProfiles.userId,
      slug: learnerProfiles.slug,
      displayName: learnerProfiles.displayName,
      profilePhotoUrl: learnerProfiles.profilePhotoUrl,
    })
    .from(learnerProfiles)
    .where(sql`${learnerProfiles.displayName} LIKE ${pattern}`)
    .limit(8);

  return Response.json({ results });
}
