import { eq } from "drizzle-orm";

import { db } from "../../client.server";
import { responseRecordRefs } from "../../schema.server";
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
