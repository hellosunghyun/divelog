import { eq } from "drizzle-orm";
import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "~/db/client.server";
import { recordReferences } from "~/db/schema.server";

export async function getRecordReferences(d1: D1Database, recordId: string) {
  const database = db(d1);
  return database
    .select()
    .from(recordReferences)
    .where(eq(recordReferences.recordId, recordId))
    .orderBy(recordReferences.sortOrder);
}

export async function syncRecordReferences(
  d1: D1Database,
  recordId: string,
  references: { url: string; title?: string }[],
) {
  const database = db(d1);
  await database.delete(recordReferences).where(eq(recordReferences.recordId, recordId));
  if (references.length === 0) return;
  await database.insert(recordReferences).values(
    references.map((ref, index) => ({
      id: nanoid(),
      recordId,
      url: ref.url,
      title: ref.title ?? null,
      sortOrder: index,
    })),
  );
}
