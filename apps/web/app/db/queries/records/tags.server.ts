import { count, eq, asc, getTableColumns } from "drizzle-orm";

import { db } from "../../client.server";
import { tags, recordTags } from "../../schema.server";

export type TagWithUsage = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
};

export async function getAllTags(d1: D1Database): Promise<TagWithUsage[]> {
  const database = db(d1);

  const result = await database
    .select({
      ...getTableColumns(tags),
      usageCount: count(recordTags.tagId),
    })
    .from(tags)
    .leftJoin(recordTags, eq(tags.id, recordTags.tagId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return result;
}

export async function getTagById(d1: D1Database, id: string) {
  const database = db(d1);
  const result = await database.select().from(tags).where(eq(tags.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getTagBySlug(d1: D1Database, slug: string) {
  const database = db(d1);
  const result = await database.select().from(tags).where(eq(tags.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getTagByName(d1: D1Database, name: string) {
  const database = db(d1);
  const result = await database.select().from(tags).where(eq(tags.name, name)).limit(1);
  return result[0] ?? null;
}

export async function createTag(
  d1: D1Database,
  data: {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    createdBy?: string;
  }
) {
  const database = db(d1);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await database.insert(tags).values({
    id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? "",
    color: data.color ?? "#6E6E73",
    createdBy: data.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return getTagById(d1, id);
}

export async function updateTag(
  d1: D1Database,
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    color?: string;
  }
) {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  await database
    .update(tags)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(tags.id, id));

  return getTagById(d1, id);
}

export async function deleteTag(d1: D1Database, id: string) {
  const database = db(d1);
  await database.delete(tags).where(eq(tags.id, id));
}

export async function getTagUsageCount(d1: D1Database, tagId: string): Promise<number> {
  const database = db(d1);

  const result = await database
    .select({ count: count() })
    .from(recordTags)
    .where(eq(recordTags.tagId, tagId));

  return result[0]?.count ?? 0;
}

export type TaggedRecord = {
  id: string;
  slug: string;
  title: string;
  content: string;
  format: string;
  type: string;
  rhythm: string | null;
  createdAt: number;
  recordedAt: number | null;
  authorId: string;
  author: {
    displayName: string | null;
    slug: string | null;
    profilePhotoUrl: string | null;
  } | null;
};

export async function getRecordsByTag(d1: D1Database, tagId: string): Promise<TaggedRecord[]> {
  const database = db(d1);

  const { records, learnerProfiles } = await import("../../schema.server");
  const { desc, and, eq, sql } = await import("drizzle-orm");

  const result = await database
    .select({
      id: records.id,
      slug: records.slug,
      title: records.title,
      content: records.content,
      format: records.format,
      type: records.type,
      rhythm: records.rhythm,
      createdAt: records.createdAt,
      recordedAt: records.recordedAt,
      authorId: records.authorId,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
    })
    .from(recordTags)
    .innerJoin(records, eq(recordTags.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(and(eq(recordTags.tagId, tagId), sql`${records.visibility} IN ('cohort', 'public')`))
    .orderBy(desc(records.createdAt));

  return result;
}

export async function getTagsByRecord(d1: D1Database, recordId: string) {
  const database = db(d1);

  const result = await database
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      color: tags.color,
    })
    .from(recordTags)
    .innerJoin(tags, eq(recordTags.tagId, tags.id))
    .where(eq(recordTags.recordId, recordId))
    .orderBy(asc(tags.name));

  return result;
}

export async function findOrCreateTag(
  d1: D1Database,
  name: string,
  createdBy?: string
): Promise<{ id: string; name: string; slug: string; isNew: boolean }> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Tag name cannot be empty");

  const existing = await getTagByName(d1, trimmedName);
  if (existing) {
    return { id: existing.id, name: existing.name, slug: existing.slug, isNew: false };
  }

  const { nanoid } = await import("../../../lib/utils/utils.server");
  const slug = `tag-${nanoid(8)}`;

  try {
    const created = await createTag(d1, {
      name: trimmedName,
      slug,
      createdBy,
    });
    if (!created) throw new Error("Tag creation returned null");
    return { id: created.id, name: created.name, slug: created.slug, isNew: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("UNIQUE") || errMsg.includes("unique")) {
      const retry = await getTagByName(d1, trimmedName);
      if (retry) return { id: retry.id, name: retry.name, slug: retry.slug, isNew: false };
    }
    throw err;
  }
}

export async function syncTagsForRecord(
  d1: D1Database,
  recordId: string,
  tagIds: string[]
): Promise<void> {
  const database = db(d1);
  await database.delete(recordTags).where(eq(recordTags.recordId, recordId));

  if (tagIds.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  await database.insert(recordTags).values(
    tagIds.map((tagId) => ({
      recordId,
      tagId,
      createdAt: now,
    }))
  );
}
