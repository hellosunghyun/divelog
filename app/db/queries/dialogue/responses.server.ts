import { and, desc, eq, gte, sql } from "drizzle-orm";

import type { CreateResponseInput } from "../../../lib/validation";
import { nanoid } from "../../../lib/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, records, responses } from "../../schema.server";

export async function getResponsesByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);

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
    .where(and(eq(responses.recordId, recordId), eq(responses.moderationStatus, "clean")))
    .orderBy(desc(responses.createdAt));
}

export async function createResponse(d1: D1Database, authorId: string, data: CreateResponseInput) {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(responses).values({
    id,
    recordId: data.recordId,
    questionId: data.questionId ?? null,
    authorId,
    type: data.type,
    content: data.content,
    visibility: data.visibility ?? "cohort",
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
      ...records,
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
