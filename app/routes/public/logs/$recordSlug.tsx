import { Link } from "~/components/content/SmartLink";
import { useActionData, useNavigation, useSubmit } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import EmptyState from "~/components/feedback/EmptyState";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
import QuestionCard from "~/components/cards/QuestionCard";
import ResponseCard from "~/components/cards/ResponseCard";
import SelfAnswerCard from "~/components/cards/SelfAnswerCard";
import SceneCard from "~/components/cards/SceneCard";
import { ContentRenderer } from "~/components/content/ContentRenderer";
import { EditedIndicator } from "~/components/ui/EditedIndicator";
import { RevisionTimeline } from "~/components/revision/RevisionTimeline";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useReadTracking } from "~/hooks/useReadTracking";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";

import type { Route } from "./+types/$recordSlug";

export { action, loader } from "./$recordSlug.server";

type Action = typeof import("./$recordSlug.server").action;
type LoaderData = Awaited<ReturnType<typeof import("./$recordSlug.server").loader>>;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 50;

type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  // Evict oldest entry if at max size
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const key = params.recordSlug ?? "";
  const cached = getCached<LoaderData>(key);
  if (cached) return cached;
  const data = await serverLoader();
  setCached(key, data);
  return data;
}

export async function clientAction({ params, serverAction }: Route.ClientActionArgs) {
  const result = await serverAction();
  cache.delete(params.recordSlug ?? "");
  return result;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "기록 — DiveLog" }];
  }

  return [
    { title: `${loaderData.record.title} — DiveLog` },
    {
      name: "description",
      content: loaderData.plainTextContent.slice(0, 150),
    },
  ];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

const RHYTHM_LABELS: Record<string, string> = {
  free: "자유",
  moment: "순간",
  sprint: "스프린트",
  weekly: "주간",
  monthly: "월간",
  stage: "구간",
  reflection: "회고",
};

const VISIBILITY_LABELS: Record<string, string> = {
  cohort: "코호트 공개",
  public: "전체 공개",
  draft: "임시저장",
};

function formatRecordDate(recordedAt: number | null, recordedEndAt: number | null): string | null {
  if (!recordedAt) return null;
  const startDate = new Date(recordedAt * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (recordedEndAt) {
    const endDate = new Date(recordedEndAt * 1000).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `${startDate} — ${endDate}`;
  }
  return startDate;
}

const ALL_RESPONSE_TYPE_OPTIONS = [
  { value: "resonance", label: "공명 — 이 기록에서 무엇이 남았는지 말합니다" },
  { value: "question", label: "질문 — 더 듣고 싶은 지점을 엽니다" },
  { value: "connection", label: "연결 — 내 경험이나 다른 기록과 이어봅니다" },
  { value: "suggestion", label: "제안 — 다음 시도를 조심스럽게 제안합니다" },
];
const NO_QUESTION_VALUE = "__none__";

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
  const { record, author, stage, questions: recordQuestions, responses: recordResponses, sentences: recordSentences, linkedRecords, incomingLinks, selfAnswers, tags: recordTags, currentUserId, contentHtml, revisions, isAuthorOrAdmin } = loaderData as LoaderData;
  const actionData = useActionData<Action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const submittingIntent = navigation.formData?.get("intent");
  const isSubmittingResponse = navigation.state === "submitting" && submittingIntent === "create_response";
  const isSubmittingSentence = navigation.state === "submitting" && submittingIntent === "save_sentence";
  const isSubmittingSelfAnswer = navigation.state === "submitting" && submittingIntent === "create_self_answer";

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const responseTypeOptions = getResponseTypeOptions(record.responsePreference);
  const [responseQuestionValue, setResponseQuestionValue] = useState(NO_QUESTION_VALUE);
  const [selectedText, setSelectedText] = useState("");
  const [showSentenceButton, setShowSentenceButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const articleContentRef = useRef<HTMLDivElement | null>(null);
  const { unmarkRead } = useReadTracking({
    recordId: record.id,
    format: record.format,
    isAuthenticated: !!currentUserId,
  });

  const isRecordAuthor = currentUserId === record.authorId;
  const recordFormat = normalizeContentFormat(record.format);
  const isArticleRecord = recordFormat === "article";
  const hasSidebarContent = recordTags.length > 0 || linkedRecords.length > 0 || incomingLinks.length > 0;

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
    <div className={`mx-auto px-6 py-16 md:py-24 relative ${hasSidebarContent ? 'max-w-content lg:grid lg:grid-cols-[minmax(0,720px)_280px] lg:gap-12 lg:justify-center' : 'max-w-reading'}`}>
      <div className="min-w-0">
      {record.visibility === "draft" && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-5 py-4">
          <p className="text-base font-medium text-warning">임시저장 상태입니다</p>
          <p className="text-sm text-text-secondary mt-1">이 기록은 아직 작성 중입니다. 준비가 되면 공개 범위를 변경해보세요.</p>
        </div>
      )}
      {record.visibility === "private" && (
        <div className="mb-6 rounded-xl border border-border bg-surface-secondary px-5 py-4">
          <p className="text-base font-medium text-text-primary">나만 보기 상태입니다</p>
          <p className="text-sm text-text-secondary mt-1">이 기록은 나만 볼 수 있습니다. 다른 사람과 나누고 싶다면 공개 범위를 변경해보세요.</p>
        </div>
      )}

      <nav aria-label="breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-text-secondary">
          <li>
            <Link to="/logs" className="hover:text-ocean-blue transition-colors no-underline">
              기록
            </Link>
          </li>
          {stage && (
            <>
              <li aria-hidden="true" className="text-text-tertiary">/</li>
              <li>
                <Link to={`/journey/${stage.slug}`} className="hover:text-ocean-blue transition-colors no-underline">
                  {stage.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true" className="text-text-tertiary">/</li>
          <li className="text-text-primary truncate max-w-[200px]" aria-current="page">
            {record.title}
          </li>
        </ol>
      </nav>

      <header className="mb-12">
        <div className="flex gap-2 mb-5 flex-wrap">
          {stage && (
            <Link to={`/journey/${stage.slug}`} className="text-caption px-3 py-1 rounded-full bg-mist-blue/30 text-ocean-blue font-medium no-underline hover:bg-mist-blue transition-colors">
              {stage.name}
            </Link>
          )}
          <span className="text-caption px-3 py-1 rounded-full border border-border bg-surface text-text-secondary">
            {record.format === "note" ? "노트" : "글"}
          </span>
          <span className="text-caption px-3 py-1 rounded-full border border-border bg-surface text-text-secondary">
            {record.type === "personal" ? "개인" : record.type === "challenge" ? "챌린지" : "협업"}
          </span>
          {record.rhythm && record.rhythm !== "free" && (
            <span className="text-caption px-3 py-1 rounded-full border border-border bg-surface text-text-secondary">
              {RHYTHM_LABELS[record.rhythm] ?? record.rhythm}
            </span>
          )}
          {record.visibility === "draft" ? (
            <span className="text-caption px-3 py-1 rounded-full bg-warning/10 text-warning font-medium">
              임시저장
            </span>
          ) : (
            <span className="text-caption px-3 py-1 rounded-full border border-border bg-surface text-text-secondary">
              {VISIBILITY_LABELS[record.visibility] ?? record.visibility}
            </span>
          )}
          {record.visibility === "private" && (
            <span className="text-caption px-3 py-1 rounded-full bg-surface-secondary text-text-secondary font-medium border border-border">
              나만 보기
            </span>
          )}
        </div>

        <h1 
          className="text-4xl md:text-5xl font-semibold text-text-primary leading-[1.15] mb-6"
          style={{ letterSpacing: 'var(--tracking-tighter, -0.04em)' }}
        >
          {record.title}
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          {author?.slug ? (
            <Link to={`/learners/${author.slug}`} className="inline-flex items-center text-sm font-medium text-text-primary bg-surface-secondary px-3 py-1.5 rounded-full hover:bg-mist-blue hover:text-ocean-blue transition-colors no-underline">
              {author.displayName ?? "작성자"}
            </Link>
          ) : (
            <span className="inline-flex items-center text-sm font-medium text-text-primary bg-surface-secondary px-3 py-1.5 rounded-full">
              {author?.displayName ?? "작성자"}
            </span>
          )}
          <time className="text-sm text-text-tertiary">
            {new Date(record.createdAt * 1000).toLocaleDateString("ko-KR")}
          </time>
          <EditedIndicator createdAt={record.createdAt} updatedAt={record.updatedAt} className="ml-1" />
          {(() => {
            const dateLabel = formatRecordDate(record.recordedAt, record.recordedEndAt);
            if (!dateLabel) return null;
            return (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                  <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
                </svg>
                {dateLabel}
              </span>
            );
          })()}

          {(isArticleRecord || isRecordAuthor) && (
            <div className="ml-auto flex items-center gap-2">
              {isArticleRecord && (
                <button
                  type="button"
                  onClick={unmarkRead}
                  className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  읽지 않음으로 표시
                </button>
              )}

              {isRecordAuthor && (
                <Link
                  to={`/logs/${record.slug}/edit`}
                  className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary no-underline transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  수정
                </Link>
              )}
            </div>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmittingSentence}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleFloatingSentenceSave}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-[0_10px_24px_rgba(11,36,71,0.12)] transition-all duration-normal hover:-translate-y-0.5 hover:border-reef-cyan/40 hover:text-ocean-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isSubmittingSentence ? "저장 중..." : "문장 저장"}
            </Button>
          </div>
        ) : null}
      </section>

      {isAuthorOrAdmin && revisions.length > 0 && (
        <section className="mb-12 border-t border-[var(--color-border)] pt-8">
          <details>
            <summary className="text-lg font-semibold text-[var(--color-text-primary)] cursor-pointer select-none">
              수정 이력 ({revisions.length}건)
            </summary>
            <div className="mt-6">
              <RevisionTimeline
                revisions={revisions}
                currentRecord={record as Record<string, unknown>}
                currentTags={recordTags}
              />
            </div>
          </details>
        </section>
      )}

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
                            <Label htmlFor={`self-answer-content-${question.id}`} className="text-sm font-medium text-text-secondary mb-2 block">
                              나의 답변
                            </Label>
                            <Textarea
                              id={`self-answer-content-${question.id}`}
                              name="content"
                              required
                              rows={4}
                              placeholder="스스로에게 답해보세요."
                              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary min-h-[100px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                            />
                          </div>

                          <div className="flex gap-3">
                            <Button
                              type="submit"
                              disabled={isSubmittingSelfAnswer}
                              className="rounded-full bg-deep-ocean text-white px-5 py-2.5 text-sm font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              {isSubmittingSelfAnswer ? "등록 중..." : "답변 등록"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedQuestionId(null)}
                              className="rounded-full px-5 py-2.5 text-sm border border-border bg-transparent text-text-secondary cursor-pointer transition-all duration-normal hover:border-text-secondary/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                            >
                              취소
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedQuestionId(question.id)}
                          className="rounded-full px-4 py-2 text-sm border border-reef-cyan/40 bg-mist-blue/20 text-ocean-blue cursor-pointer transition-all duration-normal hover:bg-mist-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
                        >
                          답변하기
                        </Button>
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
                <Label htmlFor="response-type" className="text-sm font-medium text-text-secondary mb-2 block">
                  응답 유형
                </Label>
                <Select name="type" required defaultValue={responseTypeOptions[0]?.value}>
                  <SelectTrigger id="response-type" className="w-full bg-surface">
                    <SelectValue placeholder="응답 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {responseTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="response-visibility" className="text-sm font-medium text-text-secondary mb-2 block">
                  공개 범위
                </label>
                <Select name="visibility" defaultValue="cohort">
                  <SelectTrigger id="response-visibility" className="w-full bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cohort">코호트 공개</SelectItem>
                    <SelectItem value="public">전체 공개</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recordQuestions.length > 0 ? (
                <div>
                  <Label htmlFor="question-id" className="text-sm font-medium text-text-secondary mb-2 block">
                    연결할 질문 (선택)
                  </Label>
                  <input type="hidden" name="questionId" value={responseQuestionValue === NO_QUESTION_VALUE ? "" : responseQuestionValue} />
                  <Select value={responseQuestionValue} onValueChange={setResponseQuestionValue}>
                    <SelectTrigger id="question-id" className="w-full bg-surface">
                      <SelectValue placeholder="질문 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_QUESTION_VALUE}>질문을 선택하지 않음</SelectItem>
                      {recordQuestions.map((question) => (
                        <SelectItem key={question.id} value={question.id}>
                          {question.content}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div>
                <Label htmlFor="response-content" className="text-sm font-medium text-text-secondary mb-2 block">
                  내용
                </Label>
                <Textarea
                  id="response-content"
                  name="content"
                  required
                  rows={5}
                  placeholder="이 기록에 응답해보세요."
                  className="min-h-[120px] bg-surface"
                />
              </div>

              <Button type="submit" disabled={isSubmittingResponse} className="self-start rounded-full bg-deep-ocean px-7 py-3 text-[15px] font-medium text-white hover:bg-ocean-blue">
                {isSubmittingResponse ? "등록 중..." : "응답 등록"}
              </Button>
            </form>

            <form method="post" className="flex flex-col gap-5 bg-surface rounded-lg border border-border p-6">
              <input type="hidden" name="intent" value="save_sentence" />
              <input type="hidden" name="recordId" value={record.id} />

              <h3 className="text-lg font-semibold text-text-primary tracking-tight">문장 저장하기</h3>

              <div>
                <Label htmlFor="sentence-content" className="text-sm font-medium text-text-secondary mb-2 block">
                  남겨두고 싶은 문장
                </Label>
                <Input
                  id="sentence-content"
                  name="content"
                  required
                  placeholder="기록에서 기억하고 싶은 문장을 남겨보세요."
                  className="w-full bg-surface"
                />
              </div>

              <div>
                <Label htmlFor="sentence-reason" className="text-sm font-medium text-text-secondary mb-2 block">
                  이유 (선택)
                </Label>
                <Textarea
                  id="sentence-reason"
                  name="reason"
                  rows={2}
                  placeholder="왜 이 문장을 남기고 싶은지 적어보세요."
                  className="bg-surface"
                />
              </div>

              <Button type="submit" disabled={isSubmittingSentence} className="self-start rounded-full bg-deep-ocean px-7 py-3 text-[15px] font-medium text-white hover:bg-ocean-blue">
                {isSubmittingSentence ? "저장 중..." : "문장 저장"}
              </Button>
            </form>
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
          응답 {recordResponses.length}개
        </h2>
        {recordResponses.length > 0 ? (
          <div className="relative border-l-2 border-mist-blue pl-6 py-2 flex flex-col gap-8">
            {recordResponses.map(({ response, author: responseAuthor }, i) => (
              <div 
                key={response.id} 
                className="animate-in fade-in slide-in-from-bottom-4 relative"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
              >
                <div className="absolute -left-[31px] top-6 w-3 h-3 rounded-full border-2 border-surface bg-reef-cyan shadow-sm z-10" />
                <ResponseCard response={response} author={responseAuthor ?? undefined} isSelfAnswer={response.type === "self_answer"} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState variant="responses" />
        )}
      </section>

      

      

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

      {/* 사이드바 영역 */}
      {hasSidebarContent && (
      <aside className="space-y-10 lg:sticky lg:top-24 self-start">
        {recordTags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">태그</h3>
            <div className="flex flex-wrap gap-2">
              {recordTags.map(tag => (
                <Link key={tag.id} to={`/tags/${tag.slug}`}
                  className="rounded-full px-3 py-1.5 text-xs font-medium bg-surface border border-border text-text-secondary hover:bg-mist-blue hover:text-ocean-blue hover:border-reef-cyan/30 transition-all duration-normal no-underline">
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {linkedRecords.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">연결된 기록</h3>
            <div className="flex flex-col gap-3">
              {linkedRecords.map((linkedRecord) => (
                <Link key={linkedRecord.record.id} to={`/logs/${linkedRecord.record.slug}`} className="group block rounded-xl border border-border bg-surface p-4 hover:border-ocean-blue/30 transition-colors no-underline">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm bg-mist-blue/30 text-ocean-blue mb-2 inline-block">
                    {linkedRecord.direction === "outgoing" ? "참조함" : "참조됨"}
                  </span>
                  <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-ocean-blue transition-colors">
                    {linkedRecord.record.title}
                  </p>
                  {linkedRecord.author?.displayName && (
                    <p className="text-xs text-text-tertiary mt-1.5">
                      {linkedRecord.author.displayName}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {incomingLinks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">이 글을 참조한 기록</h3>
            <div className="flex flex-col gap-3">
              {incomingLinks.map((link) => (
                <Link
                  key={link.linkId}
                  to={`/logs/${link.sourceSlug}`}
                  className="group block p-4 rounded-xl bg-surface-secondary border border-transparent hover:border-border transition-colors no-underline"
                >
                  <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-ocean-blue transition-colors">{link.sourceTitle ?? "기록"}</p>
                  <p className="text-xs text-text-tertiary mt-1.5">{link.sourceAuthorName}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
      )}
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
