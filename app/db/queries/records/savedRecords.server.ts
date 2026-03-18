import { and, desc, eq } from "drizzle-orm";

import { db } from "../../client.server";
import { learnerProfiles, records, savedRecords, stages } from "../../schema.server";

export type SavedRecord = typeof savedRecords.$inferSelect;

export async function saveRecord(d1: D1Database, learnerId: string, recordId: string): Promise<void> {
  const database = db(d1);

  await database
    .insert(savedRecords)
    .values({
      learnerId,
      recordId,
      savedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoNothing({ target: [savedRecords.learnerId, savedRecords.recordId] });
}

export async function unsaveRecord(d1: D1Database, learnerId: string, recordId: string): Promise<void> {
  const database = db(d1);

  await database
    .delete(savedRecords)
    .where(and(eq(savedRecords.learnerId, learnerId), eq(savedRecords.recordId, recordId)));
}

export async function getSavedRecords(d1: D1Database, learnerId: string): Promise<SavedRecord[]> {
  const database = db(d1);

  return database
    .select()
    .from(savedRecords)
    .where(eq(savedRecords.learnerId, learnerId));
}

export async function isRecordSaved(
  d1: D1Database,
  learnerId: string,
  recordId: string,
): Promise<boolean> {
  const database = db(d1);

  const row = await database
    .select({ learnerId: savedRecords.learnerId })
    .from(savedRecords)
    .where(and(eq(savedRecords.learnerId, learnerId), eq(savedRecords.recordId, recordId)))
    .limit(1);

  return Boolean(row[0]);
}

export async function getSavedRecordsWithDetails(d1: D1Database, learnerId: string) {
  const database = db(d1);

  return database
    .select({
      savedAt: savedRecords.savedAt,
      record: {
        id: records.id,
        slug: records.slug,
        title: records.title,
        content: records.content,
        format: records.format,
        type: records.type,
        rhythm: records.rhythm,
        createdAt: records.createdAt,
        recordedAt: records.recordedAt,
      },
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
      },
      stage: {
        name: stages.name,
        type: stages.type,
      },
    })
    .from(savedRecords)
    .innerJoin(records, eq(savedRecords.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .leftJoin(stages, eq(records.stageId, stages.id))
    .where(eq(savedRecords.learnerId, learnerId))
    .orderBy(desc(savedRecords.savedAt));
}
