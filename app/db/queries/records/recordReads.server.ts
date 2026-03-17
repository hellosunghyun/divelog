import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../client.server";
import { recordReads } from "../../schema.server";

export type RecordRead = typeof recordReads.$inferSelect;

export async function markAsRead(d1: D1Database, learnerId: string, recordId: string): Promise<void> {
  const database = db(d1);

  await database
    .insert(recordReads)
    .values({
      learnerId,
      recordId,
      readAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoNothing({ target: [recordReads.learnerId, recordReads.recordId] });
}

export async function markAsUnread(d1: D1Database, learnerId: string, recordId: string): Promise<void> {
  const database = db(d1);

  await database
    .delete(recordReads)
    .where(and(eq(recordReads.learnerId, learnerId), eq(recordReads.recordId, recordId)));
}

export async function getReadRecordIds(
  d1: D1Database,
  learnerId: string,
  recordIds: string[],
): Promise<Set<string>> {
  if (recordIds.length === 0) {
    return new Set();
  }

  const database = db(d1);

  const rows = await database
    .select({ recordId: recordReads.recordId })
    .from(recordReads)
    .where(and(eq(recordReads.learnerId, learnerId), inArray(recordReads.recordId, recordIds)));

  return new Set(rows.map((row) => row.recordId));
}

export async function clearAllReads(d1: D1Database, learnerId: string): Promise<void> {
  const database = db(d1);

  await database.delete(recordReads).where(eq(recordReads.learnerId, learnerId));
}

export async function bulkMarkAsRead(
  d1: D1Database,
  learnerId: string,
  entries: { recordId: string; readAt: number }[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const database = db(d1);

  await database
    .insert(recordReads)
    .values(entries.map((entry) => ({ learnerId, ...entry })))
    .onConflictDoNothing({ target: [recordReads.learnerId, recordReads.recordId] });
}
