import { eq, sql } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/db/client.server";
import { records, learnerProfiles } from "~/db/schema.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim();

  if (!slug) {
    return Response.json({ error: "slug required" }, { status: 400 });
  }

  const database = db(context.cloudflare.env.DB);

  const fields = {
    id: records.id,
    slug: records.slug,
    title: records.title,
    contentText: records.contentText,
    format: records.format,
    type: records.type,
    rhythm: records.rhythm,
    visibility: records.visibility,
    createdAt: records.createdAt,
    authorDisplayName: learnerProfiles.displayName,
    authorSlug: learnerProfiles.slug,
    authorPhotoUrl: learnerProfiles.profilePhotoUrl,
  };

  let result = await database
    .select(fields)
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(eq(records.slug, slug))
    .limit(1);

  if (result.length === 0) {
    result = await database
      .select(fields)
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(eq(records.id, slug))
      .limit(1);
  }

  const record = result[0];
  if (!record) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  if (record.visibility === "draft") {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const excerpt = record.contentText
    ? record.contentText.trim().length > 120
      ? `${record.contentText.trim().slice(0, 120).trimEnd()}…`
      : record.contentText.trim()
    : null;

  return Response.json({
    slug: record.slug,
    title: record.title,
    excerpt,
    format: record.format,
    type: record.type,
    rhythm: record.rhythm,
    createdAt: record.createdAt,
    authorDisplayName: record.authorDisplayName,
    authorSlug: record.authorSlug,
    authorPhotoUrl: record.authorPhotoUrl,
  }, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
