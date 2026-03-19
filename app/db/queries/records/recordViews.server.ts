import { count, eq, inArray } from "drizzle-orm";

import { db } from "../../client.server";
import { recordViews } from "../../schema.server";

export async function trackRecordView(d1: D1Database, recordId: string, viewerKey: string): Promise<boolean> {
  const database = db(d1);
  const result = await database
    .insert(recordViews)
    .values({
      recordId,
      viewerKey,
      viewedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoNothing({ target: [recordViews.recordId, recordViews.viewerKey] });

  return (result.meta.changes ?? 0) > 0;
}

export async function getRecordViewCount(d1: D1Database, recordId: string): Promise<number> {
  const database = db(d1);
  const rows = await database
    .select({ count: count() })
    .from(recordViews)
    .where(eq(recordViews.recordId, recordId))
    .limit(1);

  return rows[0]?.count ?? 0;
}

export async function getRecordViewCounts(d1: D1Database, recordIds: string[]): Promise<Map<string, number>> {
  if (recordIds.length === 0) {
    return new Map();
  }

  const database = db(d1);
  const rows = await database
    .select({
      recordId: recordViews.recordId,
      count: count(),
    })
    .from(recordViews)
    .where(inArray(recordViews.recordId, recordIds))
    .groupBy(recordViews.recordId);

  return new Map(rows.map((row) => [row.recordId, row.count]));
}
