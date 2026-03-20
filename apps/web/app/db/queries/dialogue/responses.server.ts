import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import type { CreateResponseInput, UpdateResponseInput } from "../../../lib/auth/validation";
import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, records, responses } from "../../schema.server";

interface ResponseVisibilityScope {
  viewerUserId: string | null;
  viewerCohort: string | null;
  includeRestricted?: boolean;
}

function buildAccessibleResponseCondition(scope: ResponseVisibilityScope) {
  if (scope.includeRestricted) {
    return sql`1=1`;
  }

  if (!scope.viewerUserId) {
    return eq(responses.visibility, "public");
  }

  if (scope.viewerCohort) {
    return sql`(
      ${responses.authorId} = ${scope.viewerUserId}
      OR ${responses.visibility} = 'public'
      OR (${responses.visibility} = 'cohort' AND ${records.cohort} = ${scope.viewerCohort})
    )`;
  }

  return sql`(${responses.authorId} = ${scope.viewerUserId} OR ${responses.visibility} = 'public')`;
}

export async function getResponsesByRecord(
  d1: D1Database,
  recordId: string,
  scope: ResponseVisibilityScope = {
    viewerUserId: null,
    viewerCohort: null,
    includeRestricted: false,
  },
) {
  const database = db(d1);
  const visibilityCondition = buildAccessibleResponseCondition(scope);

  return database
    .select({
      response: responses,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(responses)
    .leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId))
    .leftJoin(records, eq(responses.recordId, records.id))
    .where(and(
      eq(responses.recordId, recordId),
      inArray(responses.moderationStatus, ["clean", "tombstone"]),
      visibilityCondition,
    ))
    .orderBy(asc(responses.createdAt));
}

export async function createResponse(d1: D1Database, authorId: string, data: CreateResponseInput) {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(responses).values({
    id,
    recordId: data.recordId,
    questionId: data.questionId ?? null,
    parentResponseId: data.parentResponseId ?? null,
    authorId,
    type: data.type,
    content: data.content,
    visibility: data.visibility ?? "public",
    moderationStatus: "clean",
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getResponsesByAuthor(d1: D1Database, authorId: string) {
  const database = db(d1);

  return database
    .select()
    .from(responses)
    .where(eq(responses.authorId, authorId))
    .orderBy(desc(responses.createdAt));
}

export type RecentlyRespondedRecord = typeof records.$inferSelect & {
  recentResponseCount: number;
  lastResponseAt: number;
};

export async function getRecentlyRespondedRecords(
  d1: D1Database,
  authorId: string,
  limit = 5,
): Promise<RecentlyRespondedRecord[]> {
  const database = db(d1);
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  return database
    .select({
      id: records.id,
      slug: records.slug,
      authorId: records.authorId,
      challengeId: records.challengeId,
      collaborationUnitId: records.collaborationUnitId,
      linkedRecordId: records.linkedRecordId,
      originalUrl: records.originalUrl,
      originalTitle: records.originalTitle,
      originalDescription: records.originalDescription,
      title: records.title,
      content: records.content,
      contentText: records.contentText,
      format: records.format,
      type: records.type,
      rhythm: records.rhythm,
      visibility: records.visibility,
      responsePreference: records.responsePreference,
      searchIndexingOptOut: records.searchIndexingOptOut,
      isFeatured: records.isFeatured,
      moderationStatus: records.moderationStatus,
      moderationNote: records.moderationNote,
      cohort: records.cohort,
      recordedAt: records.recordedAt,
      recordedEndAt: records.recordedEndAt,
      createdAt: records.createdAt,
      updatedAt: records.updatedAt,
      recentResponseCount: sql<number>`count(${responses.id})`.as("recent_response_count"),
      lastResponseAt: sql<number>`max(${responses.createdAt})`.as("last_response_at"),
    })
    .from(records)
    .innerJoin(responses, eq(responses.recordId, records.id))
    .where(
      and(
        eq(records.authorId, authorId),
        gte(responses.createdAt, sevenDaysAgo),
        eq(responses.moderationStatus, "clean"),
        sql`${responses.type} != 'self_answer'`,
      ),
    )
    .groupBy(records.id)
    .orderBy(desc(sql`last_response_at`))
    .limit(limit);
}

export async function getResponseById(d1: D1Database, responseId: string) {
  const database = db(d1);

  const result = await database
    .select()
    .from(responses)
    .where(eq(responses.id, responseId));

  return result[0];
}

export async function updateResponse(
  d1: D1Database,
  responseId: string,
  authorId: string,
  data: UpdateResponseInput,
) {
  const database = db(d1);

  const response = await getResponseById(d1, responseId);
  if (!response) {
    return null;
  }

  if (response.authorId !== authorId || response.moderationStatus !== "clean") {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (data.content !== undefined) {
    updateData.content = data.content;
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
  }
  if (data.visibility !== undefined) {
    updateData.visibility = data.visibility;
  }

  await database
    .update(responses)
    .set(updateData)
    .where(eq(responses.id, responseId));

  return true;
}

export async function deleteResponse(d1: D1Database, responseId: string, authorId: string) {
  const database = db(d1);

  const response = await getResponseById(d1, responseId);
  if (!response) {
    return false;
  }

  if (response.authorId !== authorId) {
    return false;
  }

  // Check if response has children
  const childCount = await database
    .select({ count: sql<number>`count(*)` })
    .from(responses)
    .where(eq(responses.parentResponseId, responseId));

  const hasChildren = (childCount[0]?.count ?? 0) > 0;

  if (hasChildren) {
    // Tombstone: replace content and mark as tombstone
    const now = Math.floor(Date.now() / 1000);
    await database
      .update(responses)
      .set({ content: "[삭제된 응답]", moderationStatus: "tombstone", updatedAt: now })
      .where(eq(responses.id, responseId));
  } else {
    // Hard delete if no children
    await database.delete(responses).where(eq(responses.id, responseId));
  }

  return true;
}
