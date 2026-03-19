import { and, desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { learnerProfiles, records, responseRecordRefs, responses } from "../../schema.server";
import { extractRecordRefs } from "../../../lib/content/extract-references.server";
import { nanoid } from "../../../lib/utils/utils.server";

export async function syncRecordRefsForResponse(
  d1: D1Database,
  responseId: string,
  content: string,
): Promise<void> {
  const database = db(d1);

  let referencedRecordIds: string[] = [];
  try {
    const extracted = extractRecordRefs(content);
    referencedRecordIds = [...new Set(extracted.map((reference) => reference.recordId))];
  } catch {
    referencedRecordIds = [];
  }

  await database
    .delete(responseRecordRefs)
    .where(eq(responseRecordRefs.responseId, responseId));

  if (referencedRecordIds.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  await database.insert(responseRecordRefs).values(
    referencedRecordIds.map((recordId) => ({
      id: nanoid(),
      responseId,
      referencedRecordId: recordId,
      createdAt: now,
    })),
  );
}

export async function deleteRecordRefsForResponse(
  d1: D1Database,
  responseId: string,
): Promise<void> {
  const database = db(d1);
  await database
    .delete(responseRecordRefs)
    .where(eq(responseRecordRefs.responseId, responseId));
}

export interface IncomingResponseRef {
  responseId: string;
  responseType: string;
  contentExcerpt: string;
  authorDisplayName: string;
  authorSlug: string;
  authorPhotoUrl: string | null;
  sourceRecordId: string;
  sourceRecordSlug: string;
  sourceRecordTitle: string;
  createdAt: number;
}

/**
 * Get all responses that reference a given record.
 * Used for "이 글을 언급한 응답" (back-reference) section.
 * Only returns clean (non-tombstone) responses.
 */
export async function getResponsesByReferencedRecord(
  d1: D1Database,
  recordId: string,
  limit = 10,
): Promise<IncomingResponseRef[]> {
  const database = db(d1);

  const rows = await database
    .select({
      responseId: responseRecordRefs.responseId,
      responseType: responses.type,
      content: responses.content,
      authorDisplayName: learnerProfiles.displayName,
      authorSlug: learnerProfiles.slug,
      authorPhotoUrl: learnerProfiles.profilePhotoUrl,
      sourceRecordId: records.id,
      sourceRecordSlug: records.slug,
      sourceRecordTitle: records.title,
      createdAt: responses.createdAt,
    })
    .from(responseRecordRefs)
    .innerJoin(responses, eq(responseRecordRefs.responseId, responses.id))
    .innerJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId))
    .innerJoin(records, eq(responses.recordId, records.id))
    .where(
      and(
        eq(responseRecordRefs.referencedRecordId, recordId),
        eq(responses.moderationStatus, "clean"),
      ),
    )
    .orderBy(desc(responses.createdAt))
    .limit(limit);

  return rows.map(
    (row: {
      responseId: string;
      responseType: string;
      content: string;
      authorDisplayName: string;
      authorSlug: string;
      authorPhotoUrl: string | null;
      sourceRecordId: string;
      sourceRecordSlug: string;
      sourceRecordTitle: string;
      createdAt: number;
    }) => ({
      responseId: row.responseId,
      responseType: row.responseType,
      contentExcerpt: row.content.slice(0, 120),
      authorDisplayName: row.authorDisplayName,
      authorSlug: row.authorSlug,
      authorPhotoUrl: row.authorPhotoUrl,
      sourceRecordId: row.sourceRecordId,
      sourceRecordSlug: row.sourceRecordSlug,
      sourceRecordTitle: row.sourceRecordTitle,
      createdAt: row.createdAt,
    }),
  );
}
