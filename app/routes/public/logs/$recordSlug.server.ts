import { and, desc, eq } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/$recordSlug";
import { db } from "~/db/client.server";
import { requireVerified, getOptionalUser } from "~/lib/auth/auth.middleware";
import { createResponseSchema, saveSentenceSchema } from "~/lib/auth/validation";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { getPlainText, renderContentToHtml } from "~/lib/content/content.server";
import { createLogger } from "~/lib/infra/logger.server";
import { nanoid } from "~/lib/utils/utils.server";
import {
  createSelfAnswer,
  getSelfAnswersByRecord,
} from "~/db/queries/dialogue/selfAnswers.server";
import { getIncomingLinks } from "~/db/queries/records/recordLinks.server";
import { getLinkedRecords } from "~/db/queries/records/records.server";
import { getRevisionsByRecord } from "~/db/queries/records/revisions.server";
import { saveSentence } from "~/db/queries/records/sentences.server";
import { getTagsByRecord } from "~/db/queries/records/tags.server";
import {
  learnerProfiles,
  questions,
  records,
  responses,
  sentences,
  stages,
  userRoles,
} from "~/db/schema.server";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { recordSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "logs_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const optionalAuth = await getOptionalUser(request, context);

  const recordResult = await database
    .select({
      record: records,
      author: {
        displayName: learnerProfiles.displayName,
        slug: learnerProfiles.slug,
        profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        userId: learnerProfiles.userId,
      },
      stage: {
        id: stages.id,
        name: stages.name,
        slug: stages.slug,
      },
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .leftJoin(stages, eq(records.stageId, stages.id))
    .where(eq(records.slug, recordSlug))
    .limit(1);

  const recordData = recordResult[0];

  if (!recordData) {
    logger.info("not_found", { slug: recordSlug });
    throw data("기록을 찾을 수 없습니다.", { status: 404 });
  }

  const currentUserId = optionalAuth?.isAuthenticated ? optionalAuth.user.id : null;
  const isAuthor = currentUserId === recordData.record.authorId;

  if ((recordData.record.visibility === "draft" || recordData.record.visibility === "private") && !isAuthor) {
    logger.info("not_found", { slug: recordSlug });
    throw data("기록을 찾을 수 없습니다.", { status: 404 });
  }

  const [recordQuestions, recordResponses, recordSentences] = await database.batch([
    database.select().from(questions).where(eq(questions.recordId, recordData.record.id)).orderBy(desc(questions.createdAt)),
    database
      .select({
        response: responses,
        author: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
          profilePhotoUrl: learnerProfiles.profilePhotoUrl,
        },
      })
      .from(responses)
      .leftJoin(learnerProfiles, eq(responses.authorId, learnerProfiles.userId))
      .where(and(eq(responses.recordId, recordData.record.id), eq(responses.moderationStatus, "clean")))
      .orderBy(desc(responses.createdAt)),
    database
      .select({
        sentence: sentences,
        savedBy: {
          displayName: learnerProfiles.displayName,
          slug: learnerProfiles.slug,
        },
      })
      .from(sentences)
      .leftJoin(learnerProfiles, eq(sentences.savedById, learnerProfiles.userId))
      .where(eq(sentences.recordId, recordData.record.id))
      .orderBy(desc(sentences.createdAt)),
  ]);

  const [linkedRecordsRaw, selfAnswersData, recordTags, incomingLinks, isAdmin] = await Promise.all([
    getLinkedRecords(
      context.cloudflare.env.DB,
      recordData.record.id,
      recordData.record.linkedRecordId,
    ),
    getSelfAnswersByRecord(context.cloudflare.env.DB, recordData.record.id),
    getTagsByRecord(context.cloudflare.env.DB, recordData.record.id),
    getIncomingLinks(context.cloudflare.env.DB, recordData.record.id).catch((err) => {
      logger.warn("incoming_links_query_failed", {
        error: err instanceof Error ? err.message : String(err),
        recordId: recordData.record.id,
      });

      return [] as Awaited<ReturnType<typeof getIncomingLinks>>;
    }),
    optionalAuth?.isAuthenticated
      ? database
          .select()
          .from(userRoles)
          .where(and(eq(userRoles.userId, optionalAuth.user.id), eq(userRoles.role, "admin")))
          .limit(1)
          .then((adminRole) => adminRole.length > 0)
      : Promise.resolve(false),
  ]);

  const linkedRecords = linkedRecordsRaw.map((lr) => ({
    ...lr,
    contentSnippet: getPlainText(
      lr.record.content,
      normalizeContentFormat(lr.record.format),
    ).substring(0, 120),
  }));

  const isAuthorOrAdmin = isAuthor || isAdmin;

  const revisions = isAuthorOrAdmin
    ? await getRevisionsByRecord(context.cloudflare.env.DB, recordData.record.id)
    : [];

  const recordFormat = normalizeContentFormat(recordData.record.format);
  const contentHtml = renderContentToHtml(recordData.record.content, recordFormat);
  const plainTextContent = getPlainText(recordData.record.content, recordFormat);

  return {
    record: recordData.record,
    author: recordData.author,
    stage: recordData.stage,
    questions: recordQuestions,
    responses: recordResponses,
    sentences: recordSentences,
    linkedRecords,
    incomingLinks,
    selfAnswers: selfAnswersData,
    tags: recordTags,
    currentUserId,
    contentHtml,
    plainTextContent,
    revisions,
    isAuthorOrAdmin,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({ route: "logs_detail" });
  const auth = await requireVerified(request, context);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const database = db(context.cloudflare.env.DB);

  if (intent === "create_response") {
    const parsed = createResponseSchema.safeParse({
      content: formData.get("content"),
      type: formData.get("type"),
      recordId: formData.get("recordId"),
      questionId: formData.get("questionId") || undefined,
      visibility: formData.get("visibility") || "cohort",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
    }

    const targetRecord = await database
      .select({ responsePreference: records.responsePreference, visibility: records.visibility, authorId: records.authorId })
      .from(records)
      .where(eq(records.id, parsed.data.recordId))
      .limit(1);

    if (targetRecord.length > 0) {
      const pref = targetRecord[0].responsePreference;
      const visibility = targetRecord[0].visibility;
      const authorId = targetRecord[0].authorId;

      if ((visibility === "draft" || visibility === "private") && authorId !== auth.user.id) {
        return { error: "이 기록에 응답할 수 없습니다." };
      }

      if (pref === "closed") {
        return { error: "이 기록은 응답이 닫혀 있습니다." };
      }
      if (pref === "question_only" && parsed.data.type !== "question") {
        return { error: "이 기록은 질문만 허용합니다." };
      }
    }

    const id = nanoid();
    const now = Math.floor(Date.now() / 1000);

    await database.insert(responses).values({
      id,
      recordId: parsed.data.recordId,
      questionId: parsed.data.questionId ?? null,
      authorId: auth.user.id,
      type: parsed.data.type,
      content: parsed.data.content,
      visibility: parsed.data.visibility,
      moderationStatus: "clean",
      createdAt: now,
      updatedAt: now,
    });

    logger.info(parsed.data.type === "question" ? "question_create" : "response_create", {
      responseId: id,
      recordId: parsed.data.recordId,
      type: parsed.data.type,
    });

    return { success: "응답이 등록되었습니다." };
  }

  if (intent === "save_sentence") {
    const parsed = saveSentenceSchema.safeParse({
      content: formData.get("content"),
      reason: formData.get("reason") || undefined,
      recordId: formData.get("recordId"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "문장을 확인해주세요." };
    }

    const targetRecord = await database
      .select({ visibility: records.visibility, authorId: records.authorId })
      .from(records)
      .where(eq(records.id, parsed.data.recordId))
      .limit(1);

    if (targetRecord.length > 0) {
      const visibility = targetRecord[0].visibility;
      const authorId = targetRecord[0].authorId;

      if ((visibility === "draft" || visibility === "private") && authorId !== auth.user.id) {
        return { error: "이 기록에 문장을 저장할 수 없습니다." };
      }
    }

    await saveSentence(context.cloudflare.env.DB, auth.user.id, parsed.data);

    logger.info("sentence_save", {
      recordId: parsed.data.recordId,
    });

    return { success: "문장이 저장되었습니다." };
  }

  if (intent === "create_self_answer") {
    const questionId = formData.get("questionId");
    const content = formData.get("content");
    const recordId = formData.get("recordId");

    if (typeof questionId !== "string" || !questionId) {
      return { error: "질문을 선택해주세요." };
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return { error: "답변 내용을 입력해주세요." };
    }

    if (typeof recordId !== "string" || !recordId) {
      return { error: "기록 정보가 없습니다." };
    }

    const recordData = await database
      .select({ authorId: records.authorId })
      .from(records)
      .where(eq(records.id, recordId))
      .limit(1);

    if (recordData.length === 0 || recordData[0].authorId !== auth.user.id) {
      return { error: "자신의 기록에만 답변할 수 있습니다." };
    }

    await createSelfAnswer(context.cloudflare.env.DB, auth.user.id, {
      questionId,
      content: content.trim(),
    });

    logger.info("self_answer_create", { questionId, recordId });

    return { success: "자기 답변이 등록되었습니다." };
  }

  return { error: "알 수 없는 요청입니다." };
}
