import { desc, eq, sql } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { learnerProfiles, recordRevisions } from "../../schema.server";

export interface CreateRevisionParams {
  recordId: string;
  authorId: string;
  revisionNumber: number;
  snapshot: Record<string, unknown>;
  changedFields: string[];
  tagsSnapshot?: Array<{ id: string; name: string }>;
}

export async function createRevision(
  d1: D1Database,
  params: CreateRevisionParams
): Promise<string> {
  const database = db(d1);
  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(recordRevisions).values({
    id,
    recordId: params.recordId,
    authorId: params.authorId,
    revisionNumber: params.revisionNumber,
    snapshot: JSON.stringify(params.snapshot),
    changedFields: JSON.stringify(params.changedFields),
    tagsSnapshot: params.tagsSnapshot ? JSON.stringify(params.tagsSnapshot) : null,
    createdAt: now,
  });

  return id;
}

export async function getRevisionsByRecord(
  d1: D1Database,
  recordId: string
) {
  const database = db(d1);

  return database
    .select({
      revision: recordRevisions,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
      },
    })
    .from(recordRevisions)
    .leftJoin(learnerProfiles, eq(recordRevisions.authorId, learnerProfiles.userId))
    .where(eq(recordRevisions.recordId, recordId))
    .orderBy(desc(recordRevisions.revisionNumber));
}

export async function getRevisionCount(d1: D1Database, recordId: string): Promise<number> {
  const database = db(d1);

  const result = await database
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(recordRevisions)
    .where(eq(recordRevisions.recordId, recordId));

  return result[0]?.count ?? 0;
}

export async function getLatestRevisionNumber(
  d1: D1Database,
  recordId: string
): Promise<number> {
  const database = db(d1);

  const result = await database
    .select({
      maxRevision: sql<number>`max(${recordRevisions.revisionNumber})`.as("max_revision"),
    })
    .from(recordRevisions)
    .where(eq(recordRevisions.recordId, recordId));

  return result[0]?.maxRevision ?? 0;
}
