import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../client.server";
import { learnerProfiles, recordParticipants, records } from "../../schema.server";

export type RecordParticipant = typeof recordParticipants.$inferSelect;

export type ParticipantWithProfile = {
  userId: string;
  displayName: string | null;
  profilePhotoUrl: string | null;
  role: string;
  createdAt: number;
};

export async function getParticipantsByRecord(
  d1: D1Database,
  recordId: string,
): Promise<ParticipantWithProfile[]> {
  const database = db(d1);

  return database
    .select({
      userId: recordParticipants.participantUserId,
      displayName: learnerProfiles.displayName,
      profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      role: recordParticipants.role,
      createdAt: recordParticipants.createdAt,
    })
    .from(recordParticipants)
    .leftJoin(learnerProfiles, eq(recordParticipants.participantUserId, learnerProfiles.userId))
    .where(eq(recordParticipants.recordId, recordId))
    .orderBy(desc(recordParticipants.createdAt));
}

export async function syncParticipantsForRecord(
  d1: D1Database,
  recordId: string,
  participants: { userId: string; role: string }[],
  addedById: string,
): Promise<void> {
  const database = db(d1);

  const authorResult = await database
    .select({ authorId: records.authorId })
    .from(records)
    .where(eq(records.id, recordId))
    .limit(1);

  const authorId = authorResult[0]?.authorId;

  await database.delete(recordParticipants).where(eq(recordParticipants.recordId, recordId));

  const filtered = authorId
    ? participants.filter((participant) => participant.userId !== authorId)
    : participants;

  if (filtered.length === 0) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  await database.insert(recordParticipants).values(
    filtered.map((participant) => ({
      recordId,
      participantUserId: participant.userId,
      role: participant.role,
      addedById,
      createdAt: now,
    })),
  );
}

export async function getRecordsWithParticipant(
  d1: D1Database,
  userId: string,
  limit = 20,
  offset = 0,
) {
  const database = db(d1);

  return database
    .select({
      record: records,
      participantRole: recordParticipants.role,
      participantAddedAt: recordParticipants.createdAt,
      author: {
        userId: learnerProfiles.userId,
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(recordParticipants)
    .innerJoin(records, eq(recordParticipants.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(
      and(
        eq(recordParticipants.participantUserId, userId),
        sql`${records.visibility} IN ('cohort', 'public')`,
      ),
    )
    .orderBy(desc(recordParticipants.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getParticipantCountByRecord(
  d1: D1Database,
  recordId: string,
): Promise<number> {
  const database = db(d1);

  const result = await database
    .select({ count: count() })
    .from(recordParticipants)
    .where(eq(recordParticipants.recordId, recordId));

  return result[0]?.count ?? 0;
}

export async function getParticipantsBatch(d1: D1Database, recordIds: string[]) {
  if (recordIds.length === 0) {
    return [];
  }

  const database = db(d1);

  return database
    .select({
      recordId: recordParticipants.recordId,
      userId: recordParticipants.participantUserId,
      displayName: learnerProfiles.displayName,
      profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      role: recordParticipants.role,
      createdAt: recordParticipants.createdAt,
    })
    .from(recordParticipants)
    .leftJoin(learnerProfiles, eq(recordParticipants.participantUserId, learnerProfiles.userId))
    .where(inArray(recordParticipants.recordId, recordIds))
    .orderBy(desc(recordParticipants.createdAt));
}
