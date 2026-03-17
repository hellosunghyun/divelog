import { count, eq, asc } from "drizzle-orm";

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

  const allTags = await database.select().from(tags).orderBy(asc(tags.name));

  const usageCounts = await database
    .select({ tagId: recordTags.tagId, count: count() })
    .from(recordTags)
    .groupBy(recordTags.tagId);

  const countMap = new Map(usageCounts.map((uc) => [uc.tagId, uc.count]));

  return allTags.map((tag) => ({
    ...tag,
    usageCount: countMap.get(tag.id) ?? 0,
  }));
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
  authorId: string;
  author: {
    displayName: string | null;
    slug: string | null;
    profilePhotoUrl: string | null;
  } | null;
  stage: {
    name: string | null;
    type: string | null;
  } | null;
};

export async function getRecordsByTag(d1: D1Database, tagId: string): Promise<TaggedRecord[]> {
  const database = db(d1);

  const { records, stages, learnerProfiles } = await import("../../schema.server");
  const { desc, and, eq, ne } = await import("drizzle-orm");

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
      authorId: records.authorId,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      },
      stage: {
        name: stages.name,
        type: stages.type,
      },
    })
    .from(recordTags)
    .innerJoin(records, eq(recordTags.recordId, records.id))
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .leftJoin(stages, eq(records.stageId, stages.id))
    .where(and(eq(recordTags.tagId, tagId), ne(records.visibility, "draft")))
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
