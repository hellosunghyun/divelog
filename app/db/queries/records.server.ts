import { and, desc, eq, like, or, sql } from "drizzle-orm";

import type { CreateRecordInput, RecordFilterInput } from "../../lib/validation";
import { nanoid } from "../../lib/utils.server";
import { db } from "../client.server";
import { learnerProfiles, records } from "../schema.server";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

export async function getRecords(d1: D1Database, filters: RecordFilterInput = { page: 1 }) {
  const database = db(d1);
  const conditions = [];

  if (filters.stage) {
    conditions.push(eq(records.stageId, filters.stage));
  }

  if (filters.format) {
    conditions.push(eq(records.format, filters.format));
  }

  if (filters.type) {
    conditions.push(eq(records.type, filters.type));
  }

  if (filters.rhythm) {
    conditions.push(eq(records.rhythm, filters.rhythm));
  }

  if (filters.cohort) {
    conditions.push(eq(records.cohort, filters.cohort));
  }

  conditions.push(sql`${records.visibility} != 'draft'`);

  const pageSize = 20;
  const offset = (filters.page - 1) * pageSize;

  return database
    .select({
      record: records,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(and(...conditions))
    .orderBy(desc(records.createdAt))
    .limit(pageSize)
    .offset(offset);
}

export async function getRecordBySlug(d1: D1Database, slug: string) {
  const database = db(d1);
  const result = await database
    .select({
      record: records,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        userId: learnerProfiles.userId,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(eq(records.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getRecordsByAuthor(d1: D1Database, authorId: string, includePrivate = false) {
  const database = db(d1);
  const conditions = [eq(records.authorId, authorId)];

  if (!includePrivate) {
    conditions.push(sql`${records.visibility} != 'draft'`);
  }

  return database.select().from(records).where(and(...conditions)).orderBy(desc(records.createdAt));
}

export async function createRecord(d1: D1Database, authorId: string, data: CreateRecordInput) {
  const database = db(d1);
  const id = nanoid();
  const baseSlug = slugify(data.title);
  const slug = `${baseSlug}-${id.substring(0, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  await database.insert(records).values({
    id,
    slug,
    authorId,
    title: data.title,
    content: data.content,
    format: data.format ?? "note",
    type: data.type ?? "personal",
    rhythm: data.rhythm ?? "free",
    visibility: data.visibility ?? "cohort",
    responsePreference: data.responsePreference ?? "open",
    stageId: data.stageId ?? null,
    challengeId: data.challengeId ?? null,
    collaborationUnitId: data.collaborationUnitId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateRecord(
  d1: D1Database,
  id: string,
  authorId: string,
  data: Partial<CreateRecordInput>,
) {
  const database = db(d1);

  return database
    .update(records)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(and(eq(records.id, id), eq(records.authorId, authorId)));
}

export async function getDraftRecords(d1: D1Database, authorId: string) {
  const database = db(d1);

  return database
    .select()
    .from(records)
    .where(and(eq(records.authorId, authorId), eq(records.visibility, "draft")))
    .orderBy(desc(records.updatedAt));
}

export async function searchRecordsByKeyword(d1: D1Database, keyword: string, cohort?: string) {
  const database = db(d1);
  const pattern = `%${keyword}%`;
  const conditions = [
    or(like(records.title, pattern), like(records.content, pattern)),
    sql`${records.visibility} != 'draft'`,
  ];

  if (cohort) {
    conditions.push(eq(records.cohort, cohort));
  }

  return database
    .select()
    .from(records)
    .where(and(...conditions))
    .orderBy(desc(records.createdAt))
    .limit(20);
}
