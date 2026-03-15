import { sql } from "drizzle-orm";
import type { Route } from "./+types/api.search-learners";
import { db } from "../db/client.server";
import { learnerProfiles } from "../db/schema.server";
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
