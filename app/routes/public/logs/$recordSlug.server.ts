import { and, desc, eq } from "drizzle-orm";
import { data } from "react-router";
import type { Route } from "./+types/$recordSlug";
import { db } from "~/db/client.server";
import { requireVerified, getOptionalUser } from "~/lib/auth/auth.middleware";
import { createResponseSchema, saveSentenceSchema, updateResponseSchema } from "~/lib/auth/validation";
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
import { getRecordReferences } from "~/db/queries/records/references.server";
import { getRevisionsByRecord } from "~/db/queries/records/revisions.server";
import { isRecordSaved } from "~/db/queries/records/savedRecords.server";
import { saveSentence } from "~/db/queries/records/sentences.server";
import { getTagsByRecord } from "~/db/queries/records/tags.server";
import { getParticipantsByRecord } from "~/db/queries/records/participants.server";
import { getMentionsByRecord } from "~/db/queries/dialogue/mentions.server";
import {
  learnerProfiles,
  questions,
  records,
  responses,
  sentences,
  userRoles,
} from "~/db/schema.server";
import { createNotification } from "~/db/queries/social/notifications.server";
import { updateResponse, deleteResponse, getResponseById } from "~/db/queries/dialogue/responses.server";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { recordSlug } = params;
  const logger = createLogger(request, context.cloudflare.env).child({ route: "logs_detail" });
  logger.info("loader_start");
  const database = db(context.cloudflare.env.DB);
  const optionalAuth = await getOptionalUser(request, context);

  const selectFields = {
    record: records,
    author: {
      displayName: learnerProfiles.displayName,
      slug: learnerProfiles.slug,
      profilePhotoUrl: learnerProfiles.profilePhotoUrl,
      userId: learnerProfiles.userId,
    },
  };

  let recordResult = await database
    .select(selectFields)
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(eq(records.slug, recordSlug))
    .limit(1);

  if (recordResult.length === 0) {
    recordResult = await database
      .select(selectFields)
      .from(records)
      .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
      .where(eq(records.id, recordSlug))
      .limit(1);
  }

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

  const [linkedRecordsRaw, selfAnswersData, recordTags, incomingLinks, isAdmin, isSaved, participants, mentions, recordReferences] = await Promise.all([
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
    currentUserId
      ? isRecordSaved(context.cloudflare.env.DB, currentUserId, recordData.record.id)
      : Promise.resolve(false),
    getParticipantsByRecord(context.cloudflare.env.DB, recordData.record.id).catch(() =>
      [] as Awaited<ReturnType<typeof getParticipantsByRecord>>
    ),
    getMentionsByRecord(context.cloudflare.env.DB, recordData.record.id).catch(() =>
      [] as Awaited<ReturnType<typeof getMentionsByRecord>>
    ),
    recordData.record.format === "article"
      ? getRecordReferences(context.cloudflare.env.DB, recordData.record.id).catch(() =>
          [] as Awaited<ReturnType<typeof getRecordReferences>>
        )
      : Promise.resolve([]),
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
    questions: recordQuestions,
    responses: recordResponses,
    sentences: recordSentences,
    linkedRecords,
    incomingLinks,
    selfAnswers: selfAnswersData,
    tags: recordTags,
    participants,
    mentions,
    currentUserId,
    contentHtml,
    plainTextContent,
    revisions,
    isAuthorOrAdmin,
    isSaved,
    references: recordReferences,
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
      visibility: formData.get("visibility") || "public",
      parentResponseId: formData.get("parentResponseId") || undefined,
    });

    if (!parsed.success) {
      return data({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." });
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
        return data({ error: "이 기록에 응답할 수 없습니다." });
      }

      if (pref === "closed") {
        return data({ error: "이 기록은 응답이 닫혀 있습니다." });
      }
      if (pref === "question_only" && parsed.data.type !== "question") {
        return data({ error: "이 기록은 질문만 허용합니다." });
      }
    }

    // 답글 유효성 검증
    if (parsed.data.parentResponseId) {
      const parentResponse = await getResponseById(context.cloudflare.env.DB, parsed.data.parentResponseId);

      // 1. 존재 확인
      if (!parentResponse) {
        return data({ error: "답글을 달 수 없는 응답입니다." });
      }

      // 2. 같은 recordId 확인
      if (parentResponse.recordId !== parsed.data.recordId) {
        return data({ error: "답글을 달 수 없는 응답입니다." });
      }

      // 3. moderationStatus가 "clean"인지 확인
      if (parentResponse.moderationStatus !== "clean") {
        return data({ error: "답글을 달 수 없는 응답입니다." });
      }

      // 4. 답글 type이 self_answer이면 거부
      if (parsed.data.type === "self_answer") {
        return data({ error: "자기답변은 답글로 작성할 수 없습니다." });
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
      parentResponseId: parsed.data.parentResponseId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    // 알림 생성 (자기 응답 및 self_answer 제외)
    if (parsed.data.type !== "self_answer") {
      const TYPE_LABELS: Record<string, string> = {
        resonance: "공명",
        question: "질문",
        connection: "연결",
        suggestion: "제안",
      };
      const typeLabel = TYPE_LABELS[parsed.data.type] ?? parsed.data.type;

      // 작성자 이름 조회
      const authorProfile = await database
        .select({ displayName: learnerProfiles.displayName })
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, auth.user.id))
        .limit(1);
      const authorName = authorProfile[0]?.displayName ?? "누군가";

      const recordAuthorId = targetRecord[0].authorId;
      const currentUserId = auth.user.id;

      if (parsed.data.parentResponseId) {
        // 답글 알림: 부모 응답 작성자에게
        const parentResponse = await getResponseById(context.cloudflare.env.DB, parsed.data.parentResponseId);
        const parentAuthorId = parentResponse?.authorId;

        if (parentAuthorId && parentAuthorId !== currentUserId) {
          await createNotification(context.cloudflare.env.DB, {
            recipientId: parentAuthorId,
            type: "response",
            title: `${authorName}님이 답글을 남겼습니다`,
            recordId: parsed.data.recordId,
          }).catch((err) => {
            logger.warn("notification_create_failed", {
              error: err instanceof Error ? err.message : String(err),
              recordId: parsed.data.recordId,
            });
          });
        }

        // 기록 작성자가 부모 응답 작성자와 다르고, 현재 사용자가 기록 작성자가 아닐 때 추가 알림
        if (recordAuthorId !== parentAuthorId && recordAuthorId !== currentUserId) {
          await createNotification(context.cloudflare.env.DB, {
            recipientId: recordAuthorId,
            type: "response",
            title: `${authorName}님이 ${typeLabel}을 남겼습니다`,
            recordId: parsed.data.recordId,
          }).catch((err) => {
            logger.warn("notification_create_failed", {
              error: err instanceof Error ? err.message : String(err),
              recordId: parsed.data.recordId,
            });
          });
        }
      } else {
        // 일반 응답 알림: 기록 작성자에게
        if (currentUserId !== recordAuthorId) {
          await createNotification(context.cloudflare.env.DB, {
            recipientId: recordAuthorId,
            type: "response",
            title: `${authorName}님이 ${typeLabel}을 남겼습니다`,
            recordId: parsed.data.recordId,
          }).catch((err) => {
            logger.warn("notification_create_failed", {
              error: err instanceof Error ? err.message : String(err),
              recordId: parsed.data.recordId,
            });
          });
        }
      }
    }

    logger.info(parsed.data.type === "question" ? "question_create" : "response_create", {
      responseId: id,
      recordId: parsed.data.recordId,
      type: parsed.data.type,
    });

    return data({ success: "응답이 등록되었습니다." });
  }

  if (intent === "save_sentence") {
    const parsed = saveSentenceSchema.safeParse({
      content: formData.get("content"),
      reason: formData.get("reason") || undefined,
      recordId: formData.get("recordId"),
    });

    if (!parsed.success) {
      return data({ error: parsed.error.issues[0]?.message ?? "문장을 확인해주세요." });
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
        return data({ error: "이 기록에 문장을 저장할 수 없습니다." });
      }
    }

    await saveSentence(context.cloudflare.env.DB, auth.user.id, parsed.data);

    logger.info("sentence_save", {
      recordId: parsed.data.recordId,
    });

    return data({ success: "문장이 저장되었습니다." });
  }

  if (intent === "create_self_answer") {
    const questionId = formData.get("questionId");
    const content = formData.get("content");
    const recordId = formData.get("recordId");

    if (typeof questionId !== "string" || !questionId) {
      return data({ error: "질문을 선택해주세요." });
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return data({ error: "답변 내용을 입력해주세요." });
    }

    if (typeof recordId !== "string" || !recordId) {
      return data({ error: "기록 정보가 없습니다." });
    }

    const recordData = await database
      .select({ authorId: records.authorId })
      .from(records)
      .where(eq(records.id, recordId))
      .limit(1);

    if (recordData.length === 0 || recordData[0].authorId !== auth.user.id) {
      return data({ error: "자신의 기록에만 답변할 수 있습니다." });
    }

    await createSelfAnswer(context.cloudflare.env.DB, auth.user.id, {
      questionId,
      content: content.trim(),
    });

    logger.info("self_answer_create", { questionId, recordId });

    return data({ success: "자기 답변이 등록되었습니다." });
  }

  if (intent === "update_response") {
    const parsed = updateResponseSchema.safeParse({
      responseId: formData.get("responseId"),
      content: formData.get("content") || undefined,
      type: formData.get("type") || undefined,
      visibility: formData.get("visibility") || undefined,
    });

    if (!parsed.success) {
      return data({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." });
    }

    const result = await updateResponse(context.cloudflare.env.DB, parsed.data.responseId, auth.user.id, parsed.data);

    if (result === null) {
      return data({ error: "응답을 수정할 수 없습니다." });
    }

    logger.info("response_update", { responseId: parsed.data.responseId });
    return data({ success: "응답이 수정되었습니다." });
  }

  if (intent === "delete_response") {
    const responseId = formData.get("responseId");

    if (typeof responseId !== "string" || !responseId) {
      return data({ error: "응답 ID가 없습니다." });
    }

    const result = await deleteResponse(context.cloudflare.env.DB, responseId, auth.user.id);

    if (!result) {
      return data({ error: "응답을 삭제할 수 없습니다." });
    }

    logger.info("response_delete", { responseId });
    return data({ success: "응답이 삭제되었습니다." });
  }

  return data({ error: "알 수 없는 요청입니다." });
}
