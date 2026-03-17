import { and, eq, lt } from "drizzle-orm";

import { nanoid } from "../../../lib/utils/utils.server";
import { db } from "../../client.server";
import { drafts } from "../../schema.server";

export type Draft = typeof drafts.$inferSelect;

export interface DraftInput {
  id?: string;
  authorId: string;
  format: "note" | "article";
  title?: string | null;
  content?: string;
  contentJson?: string | null;
  stageId?: string | null;
  challengeId?: string | null;
  rhythm?: string;
  visibility?: "draft" | "cohort" | "public";
  responsePreference?: "open" | "question_only" | "closed";
}

export async function upsertDraft(d1: D1Database, input: DraftInput): Promise<Draft> {
  const database = db(d1);
  const now = Math.floor(Date.now() / 1000);

  const existing = await getDraftByAuthorAndFormat(d1, input.authorId, input.format);

  if (existing) {
    await database
      .update(drafts)
      .set({
        title: input.title ?? null,
        content: input.content ?? "",
        contentJson: input.contentJson ?? null,
        stageId: input.stageId ?? null,
        challengeId: input.challengeId ?? null,
        rhythm: input.rhythm ?? "free",
        visibility: input.visibility ?? "draft",
        responsePreference: input.responsePreference ?? "open",
        updatedAt: now,
      })
      .where(eq(drafts.id, existing.id));

    const updated = await getDraftByAuthorAndFormat(d1, input.authorId, input.format);
    if (!updated) {
      throw new Error("초안을 다시 불러오지 못했습니다.");
    }
    return updated;
  }

  const id = input.id ?? nanoid();
  await database.insert(drafts).values({
    id,
    authorId: input.authorId,
    format: input.format,
    title: input.title ?? null,
    content: input.content ?? "",
    contentJson: input.contentJson ?? null,
    stageId: input.stageId ?? null,
    challengeId: input.challengeId ?? null,
    rhythm: input.rhythm ?? "free",
    visibility: input.visibility ?? "draft",
    responsePreference: input.responsePreference ?? "open",
    createdAt: now,
    updatedAt: now,
  });

  const created = await getDraftByAuthorAndFormat(d1, input.authorId, input.format);
  if (!created) {
    throw new Error("생성된 초안을 찾을 수 없습니다.");
  }
  return created;
}

export async function getDraftByAuthorAndFormat(
  d1: D1Database,
  authorId: string,
  format: "note" | "article",
): Promise<Draft | null> {
  const database = db(d1);

  const rows = await database
    .select()
    .from(drafts)
    .where(and(eq(drafts.authorId, authorId), eq(drafts.format, format)))
    .limit(1);

  return rows[0] ?? null;
}

export async function deleteDraft(
  d1: D1Database,
  authorId: string,
  format: "note" | "article",
): Promise<void> {
  const database = db(d1);
  await database
    .delete(drafts)
    .where(and(eq(drafts.authorId, authorId), eq(drafts.format, format)));
}

export async function cleanupOldDrafts(d1: D1Database, daysOld: number): Promise<number> {
  const database = db(d1);
  const threshold = Math.floor(Date.now() / 1000) - daysOld * 24 * 60 * 60;

  const staleDrafts = await database
    .select({ id: drafts.id })
    .from(drafts)
    .where(lt(drafts.updatedAt, threshold));

  if (staleDrafts.length === 0) {
    return 0;
  }

  await database.delete(drafts).where(lt(drafts.updatedAt, threshold));
  return staleDrafts.length;
}
