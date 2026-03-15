import { sql, ne, and } from "drizzle-orm";
import type { Route } from "./+types/api.search-records";
import { db } from "../db/client.server";
import { records, learnerProfiles } from "../db/schema.server";
import { getOptionalUser } from "../lib/auth.middleware";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getOptionalUser(request, context);
  if (!auth?.isAuthenticated) {
    return Response.json({ results: [] });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length === 0) {
    return Response.json({ results: [] });
  }

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
        ne(records.visibility, "draft"),
        sql`(${records.title} LIKE ${pattern} OR ${records.contentText} LIKE ${pattern})`,
      ),
    )
    .limit(8);

  return Response.json({ results });
}
