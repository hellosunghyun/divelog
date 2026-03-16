import { and, desc, eq } from "drizzle-orm";
import { data, Link, redirect, useActionData, useNavigation, useSubmit } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import EmptyState from "../components/EmptyState";
import HighlightedSentenceCard from "../components/HighlightedSentenceCard";
import QuestionCard from "../components/QuestionCard";
import ResponseCard from "../components/ResponseCard";
import SelfAnswerCard from "../components/SelfAnswerCard";
import SceneCard from "../components/SceneCard";
import { ContentRenderer } from "../components/ContentRenderer";
import { db } from "../db/client.server";
import { saveSentence } from "../db/queries/sentences.server";
import { learnerProfiles, questions, records, responses, sentences } from "../db/schema.server";
import { createSelfAnswer, getSelfAnswersByRecord } from "../db/queries/selfAnswers.server";
import { getLinkedRecords } from "../db/queries/records.server";
import { getIncomingLinks } from "../db/queries/recordLinks.server";
import { getTagsByRecord } from "../db/queries/tags.server";
import { requireVerified } from "../lib/auth.middleware";
import { getPlainText, renderContentToHtml } from "../lib/content.server";
import { normalizeContentFormat } from "../lib/editor-extensions";
import { nanoid } from "../lib/utils.server";
import { createResponseSchema, saveSentenceSchema } from "../lib/validation";
import { getOptionalUser } from "../lib/auth.middleware";

import type { Route } from "./+types/_public.logs.$recordSlug";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { recordSlug } = params;
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
    })
    .from(records)
    .leftJoin(learnerProfiles, eq(records.authorId, learnerProfiles.userId))
    .where(eq(records.slug, recordSlug))
    .limit(1);

  const recordData = recordResult[0];

  if (!recordData) {
    throw data("기록을 찾을 수 없습니다.", { status: 404 });
  }

  const currentUserId = optionalAuth?.isAuthenticated ? optionalAuth.user.id : null;
  const isAuthor = currentUserId === recordData.record.authorId;

  if (recordData.record.visibility === "draft" && !isAuthor) {
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

  const linkedRecordsRaw = await getLinkedRecords(
    context.cloudflare.env.DB,
    recordData.record.id,
    recordData.record.linkedRecordId,
  );

  const linkedRecords = linkedRecordsRaw.map((lr) => ({
    ...lr,
    contentSnippet: getPlainText(
      lr.record.content,
      normalizeContentFormat(lr.record.format),
    ).substring(0, 120),
  }));

  const selfAnswersData = await getSelfAnswersByRecord(context.cloudflare.env.DB, recordData.record.id);
  const recordTags = await getTagsByRecord(context.cloudflare.env.DB, recordData.record.id);
  const incomingLinks = await getIncomingLinks(context.cloudflare.env.DB, recordData.record.id);
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
    currentUserId,
    contentHtml,
    plainTextContent,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
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
      visibility: "cohort",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
    }

    // 응답 선호도에 따른 서버사이드 검증
    const targetRecord = await database
      .select({ responsePreference: records.responsePreference })
      .from(records)
      .where(eq(records.id, parsed.data.recordId))
      .limit(1);

    if (targetRecord.length > 0) {
      const pref = targetRecord[0].responsePreference;
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
      visibility: "cohort",
      moderationStatus: "clean",
      createdAt: now,
      updatedAt: now,
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

    await saveSentence(context.cloudflare.env.DB, auth.user.id, parsed.data);

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

    return { success: "자기 답변이 등록되었습니다." };
  }

  return { error: "알 수 없는 요청입니다." };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "기록 — divelog" }];
  }

  return [
    { title: `${loaderData.record.title} — divelog` },
    {
      name: "description",
      content: loaderData.plainTextContent.slice(0, 150),
    },
  ];
}

const ALL_RESPONSE_TYPE_OPTIONS = [
  { value: "resonance", label: "공명 — 이 기록에서 무엇이 남았는지 말합니다" },
  { value: "question", label: "질문 — 더 듣고 싶은 지점을 엽니다" },
  { value: "connection", label: "연결 — 내 경험이나 다른 기록과 이어봅니다" },
  { value: "suggestion", label: "제안 — 다음 시도를 조심스럽게 제안합니다" },
];

const RESPONSE_PREFERENCE_LABELS: Record<string, string> = {
  open: "모든 응답을 환영합니다",
  question_only: "질문은 환영해요",
  closed: "그냥 읽어줘도 괜찮아요",
};

function getResponseTypeOptions(preference: string) {
  if (preference === "question_only") {
    return ALL_RESPONSE_TYPE_OPTIONS.filter((opt) => opt.value === "question");
  }
  return ALL_RESPONSE_TYPE_OPTIONS;
}

const MIN_SELECTED_SENTENCE_LENGTH = 10;
const MAX_SELECTED_SENTENCE_LENGTH = 500;
const FLOATING_BUTTON_OFFSET = 48;
const FLOATING_BUTTON_EDGE_PADDING = 96;
const FLOATING_BUTTON_TOP_PADDING = 16;

function normalizeSelectedSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isSelectionInsideElement(selection: Selection, element: HTMLElement | null) {
  if (!element || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const anchorNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
    ? range.commonAncestorContainer.parentNode
    : range.commonAncestorContainer;

  return anchorNode instanceof Node && element.contains(anchorNode);
}

export default function RecordDetailPage({ loaderData }: Route.ComponentProps) {
  const { record, author, questions: recordQuestions, responses: recordResponses, sentences: recordSentences, linkedRecords, incomingLinks, selfAnswers, tags: recordTags, currentUserId, contentHtml } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const submittingIntent = navigation.formData?.get("intent");
  const isSubmittingResponse = navigation.state === "submitting" && submittingIntent === "create_response";
  const isSubmittingSentence = navigation.state === "submitting" && submittingIntent === "save_sentence";
  const isSubmittingSelfAnswer = navigation.state === "submitting" && submittingIntent === "create_self_answer";

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showSentenceButton, setShowSentenceButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const articleContentRef = useRef<HTMLDivElement | null>(null);

  const isRecordAuthor = currentUserId === record.authorId;
  const recordFormat = normalizeContentFormat(record.format);
  const isArticleRecord = recordFormat === "article";

  const selfAnswersByQuestion = new Map<string, typeof selfAnswers>();
  for (const sa of selfAnswers) {
    const qid = sa.questionId;
    if (!selfAnswersByQuestion.has(qid)) {
      selfAnswersByQuestion.set(qid, []);
    }
    selfAnswersByQuestion.get(qid)!.push(sa);
  }

  const hideSentenceButton = useCallback(() => {
    setSelectedText("");
    setShowSentenceButton(false);
    setButtonPosition({ x: 0, y: 0 });
  }, []);

  const dismissSentenceSelection = useCallback(() => {
    hideSentenceButton();
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  }, [hideSentenceButton]);

  const handleArticleMouseUp = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      hideSentenceButton();
      return;
    }

    if (!isSelectionInsideElement(selection, articleContentRef.current)) {
      hideSentenceButton();
      return;
    }

    const normalizedText = normalizeSelectedSentence(selection.toString());

    if (
      normalizedText.length < MIN_SELECTED_SENTENCE_LENGTH
      || normalizedText.length > MAX_SELECTED_SENTENCE_LENGTH
    ) {
      hideSentenceButton();
      return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      hideSentenceButton();
      return;
    }

    setSelectedText(normalizedText);
    setButtonPosition({
      x: Math.min(
        Math.max(rect.left + rect.width / 2, FLOATING_BUTTON_EDGE_PADDING),
        window.innerWidth - FLOATING_BUTTON_EDGE_PADDING,
      ),
      y: Math.max(rect.top - FLOATING_BUTTON_OFFSET, FLOATING_BUTTON_TOP_PADDING),
    });
    setShowSentenceButton(true);
  }, [hideSentenceButton]);

  const handleFloatingSentenceSave = useCallback(() => {
    if (!selectedText) {
      return;
    }

    submit(
      {
        intent: "save_sentence",
        recordId: record.id,
        content: selectedText,
      },
      { method: "post" },
    );

    dismissSentenceSelection();
  }, [dismissSentenceSelection, record.id, selectedText, submit]);

  useEffect(() => {
    if (!isArticleRecord) {
      return;
    }

    const articleContentElement = articleContentRef.current;

    if (!articleContentElement) {
      return;
    }

    articleContentElement.addEventListener("mouseup", handleArticleMouseUp);

    return () => {
      articleContentElement.removeEventListener("mouseup", handleArticleMouseUp);
    };
  }, [handleArticleMouseUp, isArticleRecord]);

  useEffect(() => {
    if (!showSentenceButton || typeof document === "undefined") {
      return;
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        hideSentenceButton();
      }
    };

    const handleViewportChange = () => {
      hideSentenceButton();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [hideSentenceButton, showSentenceButton]);

  return (
    <div className="max-w-reading mx-auto py-16 px-6 md:py-24">
      {record.visibility === "draft" && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-5 py-4">
          <p className="text-base font-medium text-warning">임시저장 상태입니다</p>
          <p className="text-sm text-text-secondary mt-1">이 기록은 나만 볼 수 있습니다. 준비가 되면 공개 범위를 변경해보세요.</p>
        </div>
      )}

      <header className="mb-10">
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
            {record.format === "note" ? "노트" : "글"}
          </span>
          <span className="text-caption px-2 py-0.5 rounded-full bg-border text-text-secondary">
            {record.type === "personal" ? "개인" : record.type === "challenge" ? "챌린지" : "협업"}
          </span>
          {record.visibility === "draft" && (
            <span className="text-caption px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
              임시저장
            </span>
          )}
        </div>

        <h1 className="text-3xl font-semibold text-text-primary leading-tight tracking-tight mb-4">
          {record.title}
        </h1>

        <div className="flex items-center gap-4 flex-wrap">
          {author?.slug ? (
            <Link to={`/learners/${author.slug}`} className="text-sm text-text-secondary no-underline hover:text-ocean-blue transition-colors">
              {author.displayName ?? "작성자"}
            </Link>
          ) : (
            <p className="text-sm text-text-secondary">{author?.displayName ?? "작성자"}</p>
          )}

          {recordTags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {recordTags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tags/${tag.slug}`}
                  className="text-caption px-2 py-0.5 rounded-full border border-border bg-surface text-text-secondary no-underline transition-all duration-normal hover:border-reef-cyan/40 hover:bg-mist-blue/20 hover:text-ocean-blue"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {isRecordAuthor && (
            <Link
              to={`/logs/${record.slug}/edit`}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-caption font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              수정
            </Link>
          )}
        </div>
      </header>

      <section className="mb-12 relative">
        {isArticleRecord ? (
          <div ref={articleContentRef}>
            <ContentRenderer contentHtml={contentHtml} format={recordFormat} />
          </div>
        ) : (
          <ContentRenderer contentHtml={contentHtml} format={recordFormat} />
        )}

        {showSentenceButton && selectedText ? (
          <div
            className="fixed z-50"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y,
              transform: "translateX(-50%)",
            }}
          >
            <button
              type="button"
              disabled={isSubmittingSentence}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleFloatingSentenceSave}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(11,36,71,0.12)] transition-all duration-normal hover:-translate-y-0.5 hover:border-reef-cyan/40 hover:text-ocean-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isSubmittingSentence ? "저장 중..." : "문장 저장"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
          남겨진 질문
        </h2>
        {recordQuestions.length > 0 ? (
          <div className="flex flex-col gap-8">
            {recordQuestions.map((question) => {
              const questionSelfAnswers = selfAnswersByQuestion.get(question.id) ?? [];
              const isExpanded = expandedQuestionId === question.id;

              return (
                <div key={question.id} className="flex flex-col gap-4">
                  <QuestionCard question={question} />
                  
                  {questionSelfAnswers.length > 0 && (
                    <div className="ml-4 flex flex-col gap-3">
                      {questionSelfAnswers.map(({ selfAnswer, author: selfAnswerAuthor }) => (
                        <SelfAnswerCard
                          key={selfAnswer.id}
                          selfAnswer={selfAnswer}
                        />
                      ))}
                    </div>
                  )}

                  {isRecordAuthor && (
                    <div className="ml-4">
                      {isExpanded ? (
                        <form method="post" className="flex flex-col gap-4 bg-mist-blue/30 rounded-xl border border-reef-cyan/30 p-5">
                          <input type="hidden" name="intent" value="create_self_answer" />
                          <input type="hidden" name="questionId" value={question.id} />
                          <input type="hidden" name="recordId" value={record.id} />
                          
                          <div>
                            <label htmlFor={`self-answer-content-${question.id}`} className="text-sm font-medium text-text-secondary mb-2 block">
                              나의 답변
                            </label>
                            <textarea
                              id={`self-answer-content-${question.id}`}
                              name="content"
                              required
                              rows={4}
                              placeholder="스스로에게 답해보세요."
                              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary min-h-[100px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={isSubmittingSelfAnswer}
                              className="rounded-full bg-deep-ocean text-white px-5 py-2.5 text-sm font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              {isSubmittingSelfAnswer ? "등록 중..." : "답변 등록"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedQuestionId(null)}
                              className="rounded-full px-5 py-2.5 text-sm border border-border bg-transparent text-text-secondary cursor-pointer transition-all duration-normal hover:border-text-secondary/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                            >
                              취소
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedQuestionId(question.id)}
                          className="rounded-full px-4 py-2 text-sm border border-reef-cyan/40 bg-mist-blue/20 text-ocean-blue cursor-pointer transition-all duration-normal hover:bg-mist-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                        >
                          답변하기
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState variant="questions" />
        )}
      </section>

      {record.responsePreference !== "closed" && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-4">
            응답 남기기
          </h2>
          <p className="text-base text-text-secondary mb-6">
            {RESPONSE_PREFERENCE_LABELS[record.responsePreference] ?? "이 기록에 응답해보세요."}
          </p>

          {actionData && "error" in actionData ? (
            <p className="text-error mb-4 text-sm">{actionData.error}</p>
          ) : null}

          {actionData && "success" in actionData ? (
            <p className="text-success mb-4 text-sm">{actionData.success}</p>
          ) : null}

          <div className="grid gap-6">
            <form method="post" className="flex flex-col gap-5 bg-surface rounded-lg border border-border p-6">
              <input type="hidden" name="intent" value="create_response" />
              <input type="hidden" name="recordId" value={record.id} />

              <div>
                <label htmlFor="response-type" className="text-sm font-medium text-text-secondary mb-2 block">
                  응답 유형
                </label>
                <select id="response-type" name="type" required className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">
                  {getResponseTypeOptions(record.responsePreference).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {recordQuestions.length > 0 ? (
                <div>
                  <label htmlFor="question-id" className="text-sm font-medium text-text-secondary mb-2 block">
                    연결할 질문 (선택)
                  </label>
                  <select id="question-id" name="questionId" className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">
                    <option value="">질문을 선택하지 않음</option>
                    {recordQuestions.map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.content}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label htmlFor="response-content" className="text-sm font-medium text-text-secondary mb-2 block">
                  내용
                </label>
                <textarea id="response-content" name="content" required rows={5} placeholder="이 기록에 응답해보세요." className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary min-h-[120px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2" />
              </div>

              <button type="submit" disabled={isSubmittingResponse} className="rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 self-start disabled:opacity-60">
                {isSubmittingResponse ? "등록 중..." : "응답 등록"}
              </button>
            </form>

            <form method="post" className="flex flex-col gap-5 bg-surface rounded-lg border border-border p-6">
              <input type="hidden" name="intent" value="save_sentence" />
              <input type="hidden" name="recordId" value={record.id} />

              <h3 className="text-lg font-semibold text-text-primary tracking-tight">문장 저장하기</h3>

              <div>
                <label htmlFor="sentence-content" className="text-sm font-medium text-text-secondary mb-2 block">
                  남겨두고 싶은 문장
                </label>
                <textarea id="sentence-content" name="content" required rows={3} placeholder="기록에서 기억하고 싶은 문장을 남겨보세요." className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary min-h-[80px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2" />
              </div>

              <div>
                <label htmlFor="sentence-reason" className="text-sm font-medium text-text-secondary mb-2 block">
                  이유 (선택)
                </label>
                <textarea id="sentence-reason" name="reason" rows={2} placeholder="왜 이 문장을 남기고 싶은지 적어보세요." className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2" />
              </div>

              <button type="submit" disabled={isSubmittingSentence} className="rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 self-start disabled:opacity-60">
                {isSubmittingSentence ? "저장 중..." : "문장 저장"}
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
          응답 {recordResponses.length}개
        </h2>
        {recordResponses.length > 0 ? (
          <div className="flex flex-col gap-5">
            {recordResponses.map(({ response, author: responseAuthor }) => (
              <ResponseCard key={response.id} response={response} author={responseAuthor ?? undefined} isSelfAnswer={response.type === "self_answer"} />
            ))}
          </div>
        ) : (
          <EmptyState variant="responses" />
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
          연결된 기록
        </h2>
        {linkedRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {linkedRecords.map((linkedRecord) => (
              <div key={linkedRecord.record.id} className="relative">
                <SceneCard
                  record={linkedRecord.record}
                  contentSnippet={linkedRecord.contentSnippet}
                  author={linkedRecord.author?.displayName ? {
                    displayName: linkedRecord.author.displayName,
                    slug: linkedRecord.author.slug ?? "",
                  } : undefined}
                />
                <span className="absolute top-4 right-4 text-caption px-2 py-0.5 rounded-full bg-mist-blue text-ocean-blue">
                  {linkedRecord.direction === "outgoing" ? "참조" : "역참조"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-12 px-4 gap-4">
            <p className="text-base text-text-secondary leading-body">아직 연결된 기록이 없습니다.</p>
            {isRecordAuthor && (
              <Link
                to={`/write`}
                className="mt-2 px-5 py-2.5 rounded-full bg-ocean-blue text-white text-sm font-medium hover:bg-deep-ocean transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 no-underline"
              >
                이어서 기록하기
              </Link>
            )}
          </div>
        )}
      </section>

      {incomingLinks.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-6">
            이 글을 참조한 기록
          </h2>
          <div className="flex flex-col gap-3">
            {incomingLinks.map((link) => (
              <Link
                key={link.linkId}
                to={`/logs/${link.sourceSlug}`}
                className="block p-4 rounded-xl bg-surface-secondary border border-border hover:border-ocean-blue/30 transition-colors no-underline"
              >
                <p className="text-base font-medium text-text-primary">{link.sourceTitle ?? "기록"}</p>
                <p className="text-sm text-text-tertiary mt-1">{link.sourceAuthorName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
          남겨두고 싶은 문장들
        </h2>
        {recordSentences.length > 0 ? (
          <div className="flex flex-col gap-5">
            {recordSentences.map(({ sentence, savedBy }) => (
              <HighlightedSentenceCard key={sentence.id} sentence={sentence} savedBy={savedBy ?? undefined} />
            ))}
          </div>
        ) : (
          <EmptyState variant="generic" message="아직 저장된 문장이 없습니다." />
        )}
      </section>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-xl font-semibold text-text-primary">기록을 찾을 수 없습니다.</p>
      <Link to="/logs" className="mt-4 inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">
        기록 목록으로
      </Link>
    </div>
  );
}
