import { and, eq } from "drizzle-orm";

import { db } from "../client.server";
import { savedRecords } from "../schema.server";

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
