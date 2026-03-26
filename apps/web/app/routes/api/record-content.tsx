import { eq, sql } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";

import { db } from "~/db/client.server";
import { learnerProfiles, records } from "~/db/schema.server";
import { getOptionalUser } from "~/lib/auth/auth.middleware.server";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { renderContentToHtml, type MentionSlugMap } from "~/lib/content/content.server";
import { extractMentionUserIdsFromContent } from "~/db/queries/dialogue/mentions.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const recordId = url.searchParams.get("id")?.trim();
  const recordSlug = url.searchParams.get("slug")?.trim();

  if (!recordId && !recordSlug) {
    return Response.json({ error: "id 또는 slug가 필요합니다" }, { status: 400 });
  }

  const database = db(context.cloudflare.env.DB);
  const auth = await getOptionalUser(request, context);
  const currentUserId = auth?.isAuthenticated ? auth.user.id : null;

  const selectFields = {
    id: records.id,
    slug: records.slug,
    content: records.content,
    format: records.format,
    visibility: records.visibility,
    cohort: records.cohort,
    authorId: records.authorId,
  };

  let recordResult = recordId
    ? await database
        .select(selectFields)
        .from(records)
        .where(eq(records.id, recordId))
        .limit(1)
    : [];

  if (recordResult.length === 0 && recordSlug) {
    recordResult = await database
      .select(selectFields)
      .from(records)
      .where(eq(records.slug, recordSlug))
      .limit(1);
  }

  const record = recordResult[0];
  if (!record) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const viewerCohort = currentUserId
    ? await getUserCohort(database, currentUserId)
    : null;

  const isAuthor = currentUserId === record.authorId;
  const canViewRecord = canAccessRecordVisibility({
    visibility: record.visibility,
    recordCohort: record.cohort,
    isAuthor,
    viewerCohort,
  });

  if (!canViewRecord) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const mentionSlugMap = await buildMentionSlugMap(database, record.content);
  const contentHtml = renderContentToHtml(
    record.content,
    normalizeContentFormat(record.format),
    mentionSlugMap,
  );

  return Response.json({
    id: record.id,
    slug: record.slug,
    content: record.content,
    contentHtml,
  }, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

type DrizzleDB = ReturnType<typeof db>;

function canAccessRecordVisibility({
  visibility,
  recordCohort,
  isAuthor,
  viewerCohort,
}: {
  visibility: string;
  recordCohort: string | null;
  isAuthor: boolean;
  viewerCohort: string | null;
}): boolean {
  if (isAuthor) {
    return true;
  }

  if (visibility === "public") {
    return true;
  }

  if (visibility === "cohort") {
    return !!viewerCohort && !!recordCohort && viewerCohort === recordCohort;
  }

  return false;
}

async function getUserCohort(database: DrizzleDB, userId: string): Promise<string | null> {
  const result = await database
    .select({ cohort: learnerProfiles.cohort })
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .limit(1);

  return result[0]?.cohort ?? null;
}

async function buildMentionSlugMap(
  database: DrizzleDB,
  content: string,
): Promise<MentionSlugMap> {
  const map: MentionSlugMap = new Map();
  const mentionIds = extractMentionUserIdsFromContent(content);

  if (mentionIds.length === 0) {
    return map;
  }

  const results = await database
    .select({ userId: learnerProfiles.userId, slug: learnerProfiles.slug })
    .from(learnerProfiles)
    .where(
      sql`${learnerProfiles.slug} IN (${sql.join(mentionIds.map((id) => sql`${id}`), sql`, `)}) OR ${learnerProfiles.userId} IN (${sql.join(mentionIds.map((id) => sql`${id}`), sql`, `)})`,
    );

  for (const row of results) {
    if (row.slug && mentionIds.includes(row.slug)) {
      map.set(row.slug, row.slug);
    }

    if (mentionIds.includes(row.userId) && row.slug) {
      map.set(row.userId, row.slug);
    }
  }

  return map;
}
