import { Link } from "~/components/content/SmartLink";
import { useFetcher, useActionData, useNavigation, useSubmit, isRouteErrorResponse, useRouteError } from "react-router";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react-router/cloudflare";

import { cn } from "~/lib/utils/cn";
import EmptyState from "~/components/feedback/EmptyState";
import { SubmitButton } from "~/components/feedback/SubmitButton";
import HighlightedSentenceCard from "~/components/cards/HighlightedSentenceCard";
import QuestionCard from "~/components/cards/QuestionCard";
import ResponseCard from "~/components/cards/ResponseCard";
import SelfAnswerCard from "~/components/cards/SelfAnswerCard";
import SceneCard from "~/components/cards/SceneCard";
import { IncomingResponseRefs } from "~/components/sections/IncomingResponseRefs";
import { ContentRenderer } from "~/components/content/ContentRenderer";
import { EditedIndicator } from "~/components/ui/EditedIndicator";
import { Button } from "~/components/ui/button";
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
import { RECORD_TYPE_LABELS, type RecordType } from "~/lib/constants/record-types";
import { normalizeContentFormat } from "~/lib/content/editor-extensions";
import { buildResponseTree, type ThreadedResponse } from "~/lib/utils/thread-tree";

import type { Route } from "./+types/$recordSlug";

export { action, loader } from "./$recordSlug.server";

type Action = typeof import("./$recordSlug.server").action;
type LoaderData = Awaited<ReturnType<typeof import("./$recordSlug.server").loader>>;

const LazyResponseEditor = lazy(() => import("~/components/editor/editors/ResponseEditor"));

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

  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("divelog:invalidate-record-cache")) {
    sessionStorage.removeItem("divelog:invalidate-record-cache");
    cache.delete(key);
  }

  const cached = getCached<LoaderData>(key);
  if (cached) return cached;

  try {
    const data = await serverLoader();
    setCached(key, data);
    return data;
  } catch (error) {
    const staleEntry = cache.get(key);
    if (staleEntry) return staleEntry.data as LoaderData;
    throw error;
  }
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
    ...(loaderData.record.searchIndexingOptOut
      ? [{ name: "robots", content: "noindex" as const }]
      : []),
  ];
}

export function shouldRevalidate({
  formMethod,
  formAction,
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  formAction?: string;
  currentParams: Record<string, string>;
  nextParams: Record<string, string>;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (currentParams.recordSlug !== nextParams.recordSlug) {
    return true;
  }
  if (formAction?.startsWith("/api/")) {
    return false;
  }
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

const RHYTHM_LABELS: Record<string, string> = {
  free: "자유",
  moment: "순간",
  weekly: "주간",
  monthly: "월간",
  stage: "구간",
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
  { value: "resonance", label: "공명 — 이 기록에서 무엇이 남았는지 말합니다", shortLabel: "공명" },
  { value: "question", label: "질문 — 더 듣고 싶은 지점을 엽니다", shortLabel: "질문" },
  { value: "connection", label: "연결 — 내 경험이나 다른 기록과 이어봅니다", shortLabel: "연결" },
  { value: "suggestion", label: "제안 — 다음 시도를 조심스럽게 제안합니다", shortLabel: "제안" },
];

const RESPONSE_PLACEHOLDERS: Record<string, string> = {
  resonance: "이 기록에서 무엇이 남았는지 적어보세요.",
  question: "더 듣고 싶은 지점을 적어보세요.",
  connection: "내 경험이나 다른 기록과 어떻게 이어지는지 적어보세요.",
  suggestion: "다음 시도를 조심스럽게 제안해보세요.",
};
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

const MIN_SELECTED_SENTENCE_LENGTH = 2;
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

type ResponseNode = {
  id: string;
  type: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  authorId: string;
  moderationStatus: string;
  parentResponseId: string | null;
  contentHtml?: string;
  author?: { displayName: string | null; slug: string | null; profilePhotoUrl: string | null } | null;
  [key: string]: unknown;
};

type RenderThreadContext = {
  editingResponseId: string | null;
  editingContent: object | null;
  editingResponseType: string;
  setEditingContent: (v: object | null) => void;
  setEditingResponseId: (v: string | null) => void;
  setEditingResponseType: (v: string) => void;
  handleEditResponse: (id: string) => void;
  handleDeleteResponse: (id: string) => void;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  replyResponseType: string;
  setReplyResponseType: (v: string) => void;
  replyContent: object | null;
  setReplyContent: (v: object | null) => void;
  currentUserId: string | null | undefined;
  loaderData: LoaderData;
  deletingResponseId: string | null;
};

const DEPTH_INDENT_CLASSES: Record<number, string> = {
  0: "",
  1: "ml-6",
  2: "ml-12",
  3: "ml-18",
};

const MAX_THREAD_DEPTH = 10;

function textToTiptapDoc(text: string): object {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text
          ? [{ type: "text", text }]
          : [],
      },
    ],
  };
}

function parseResponseContent(value: string): object {
  const trimmed = value.trim();
  if (!trimmed) {
    return textToTiptapDoc("");
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return textToTiptapDoc(value);
    }
  }

  return textToTiptapDoc(value);
}

function renderResponseThread(
  node: ThreadedResponse<ResponseNode>,
  depth: number,
  ctx: RenderThreadContext
): React.ReactNode {
  if (depth > MAX_THREAD_DEPTH) return null;

  const cappedDepth = Math.min(depth, 3);
  const isTombstone = node.moderationStatus === "tombstone";
  const indentClass = DEPTH_INDENT_CLASSES[cappedDepth] ?? "ml-18";
  const showDepthPrefix = depth >= 3;

  const authorForCard = node.author?.displayName && node.author?.slug
    ? { displayName: node.author.displayName, slug: node.author.slug }
    : undefined;

  return (
    <div key={node.id} className="flex flex-col">
      <div
        className={cn(
          "relative",
          indentClass,
          depth > 0 && "pl-4 border-l border-[#E3E8EF]/60"
        )}
      >
        {showDepthPrefix && (
          <span className="text-sm text-[#8C8C91] mb-1 block">↳ 답글</span>
        )}

        {isTombstone ? (
          <div className="py-3 px-4 text-sm text-[#8C8C91] italic bg-surface-secondary/50 rounded-xl">
            [삭제된 응답]
          </div>
        ) : ctx.editingResponseId === node.id ? (
          <form method="post" className="flex flex-col gap-4 bg-surface-secondary rounded-xl border border-border p-5">
            <input type="hidden" name="intent" value="update_response" />
            <input type="hidden" name="responseId" value={node.id} />
            <input type="hidden" name="type" value={ctx.editingResponseType} />

            <div className="flex gap-2 flex-wrap">
              {ALL_RESPONSE_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="edit-type-radio"
                    value={option.value}
                    checked={ctx.editingResponseType === option.value}
                    onChange={() => ctx.setEditingResponseType(option.value)}
                    className="sr-only"
                  />
                  <span className={cn(
                    "inline-block text-sm px-3 py-1 rounded-full border transition-all",
                    ctx.editingResponseType === option.value
                      ? "bg-deep-ocean text-white border-deep-ocean"
                      : "border-border text-text-secondary bg-surface hover:border-ocean-blue/30 hover:bg-mist-blue/30"
                  )}>
                    {option.shortLabel}
                  </span>
                </label>
              ))}
            </div>

            <Suspense fallback={<div className="h-20 bg-[#F6F8FB] rounded-xl animate-pulse" />}>
              <LazyResponseEditor
                content={ctx.editingContent ?? undefined}
                onChange={(json: object) => ctx.setEditingContent(json)}
              />
            </Suspense>
            <input
              type="hidden"
              name="content"
              value={ctx.editingContent ? JSON.stringify(ctx.editingContent) : ""}
            />
            <div className="flex gap-3">
              <SubmitButton
                formDataMatch={{ intent: "update_response" }}
                loadingText="저장 중..."
                className="rounded-full bg-deep-ocean text-white px-5 py-2.5 text-sm"
                spinnerSize="sm"
              >
                저장
              </SubmitButton>
              <Button type="button" variant="ghost" onClick={() => ctx.setEditingResponseId(null)} className="rounded-full px-5 py-2.5 text-sm border border-border">
                취소
              </Button>
            </div>
          </form>
         ) : (
           <>
               <ResponseCard
                 response={node}
                 contentHtml={typeof node.contentHtml === "string" ? node.contentHtml : undefined}
                 author={authorForCard}
                 isSelfAnswer={node.type === "self_answer"}
                 currentUserId={ctx.currentUserId}
                onEdit={ctx.handleEditResponse}
                onDelete={ctx.handleDeleteResponse}
                onReply={ctx.setReplyingToId}
                isDeleting={ctx.deletingResponseId === node.id}
              />
              {ctx.replyingToId === node.id && (
                <div className="mt-4 pl-4 border-l-2 border-[#E3E8EF]">
                  <form method="post" className="flex flex-col gap-3 bg-surface-secondary rounded-xl border border-border p-4">
                    <input type="hidden" name="intent" value="create_response" />
                    <input type="hidden" name="recordId" value={ctx.loaderData.record.id} />
                    <input type="hidden" name="parentResponseId" value={node.id} />
                    <input type="hidden" name="type" value={ctx.replyResponseType} />
                    
                    <div className="flex gap-2 flex-wrap">
                      {ALL_RESPONSE_TYPE_OPTIONS.map((option) => (
                        <label key={option.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="reply-type-radio"
                            value={option.value}
                            checked={ctx.replyResponseType === option.value}
                            onChange={() => ctx.setReplyResponseType(option.value)}
                            className="sr-only"
                          />
                          <span className={cn(
                            "inline-block text-sm px-3 py-1 rounded-full border transition-all",
                            ctx.replyResponseType === option.value
                              ? "bg-deep-ocean text-white border-deep-ocean"
                              : "border-border text-text-secondary bg-surface hover:border-ocean-blue/30 hover:bg-mist-blue/30"
                          )}>
                            {option.shortLabel}
                          </span>
                        </label>
                      ))}
                    </div>
                    
                    <Suspense fallback={<div className="h-20 bg-[#F6F8FB] rounded-xl animate-pulse" />}>
                      <LazyResponseEditor
                        content={ctx.replyContent ?? undefined}
                        onChange={(json: object) => ctx.setReplyContent(json)}
                        placeholder="답글을 입력하세요..."
                      />
                    </Suspense>
                    <input
                      type="hidden"
                      name="content"
                      value={ctx.replyContent ? JSON.stringify(ctx.replyContent) : ""}
                    />
                    <input type="hidden" name="visibility" value="public" />
                    
                    <div className="flex gap-2">
                      <SubmitButton
                        formDataMatch={{ intent: "create_response" }}
                        loadingText="등록 중..."
                        className="rounded-full bg-deep-ocean text-white text-sm px-4 py-2"
                        spinnerSize="sm"
                      >
                        답글 등록
                      </SubmitButton>
                      <Button type="button" variant="ghost" onClick={() => ctx.setReplyingToId(null)} className="rounded-full text-sm px-4 py-2">취소</Button>
                    </div>
                  </form>
                </div>
              )}
           </>
         )}
       </div>

       {node.children.length > 0 && (
         <div className="flex flex-col gap-6 mt-6">
           {node.children.map((child) =>
             renderResponseThread(child, depth + 1, ctx)
           )}
         </div>
       )}
     </div>
   );
}

export default function RecordDetailPage({ loaderData }: Route.ComponentProps) {
  const {
    record,
    author,
    questions: recordQuestions,
    responses: recordResponses,
    sentences: recordSentences,
    linkedRecords,
    incomingLinks,
    selfAnswers,
    tags: recordTags,
    participants,
    mentions,
    currentUserId,
    contentHtml,
    revisions,
    isAuthorOrAdmin,
    isSaved: initialIsSaved,
    references,
    incomingResponseRefs,
  } = loaderData as LoaderData;
  const actionData = useActionData<Action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const deletingResponseId = navigation.state === "submitting"
    && navigation.formData?.get("intent") === "delete_response"
    ? String(navigation.formData.get("responseId"))
    : null;

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<object | null>(null);
  const [editingResponseType, setEditingResponseType] = useState("");
  const [replyingToId, setReplyingToIdRaw] = useState<string | null>(null);
  const [replyResponseType, setReplyResponseType] = useState(ALL_RESPONSE_TYPE_OPTIONS[0]?.value ?? "resonance");
  const [replyContent, setReplyContent] = useState<object | null>(null);
  const [createContent, setCreateContent] = useState<object | null>(null);
  const setReplyingToId = useCallback((id: string | null) => {
    setReplyingToIdRaw(id);
    setReplyContent(null);
    if (id !== null) {
      setReplyResponseType(ALL_RESPONSE_TYPE_OPTIONS[0]?.value ?? "resonance");
    }
  }, []);
  const responseTypeOptions = getResponseTypeOptions(record.responsePreference);
  const [responseQuestionValue, setResponseQuestionValue] = useState(NO_QUESTION_VALUE);
  const [selectedResponseType, setSelectedResponseType] = useState(responseTypeOptions[0]?.value ?? "resonance");
  const [selectedText, setSelectedText] = useState("");
  const [showSentenceButton, setShowSentenceButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [showSentencePopup, setShowSentencePopup] = useState(false);
  const [sentenceReason, setSentenceReason] = useState("");
  const articleContentRef = useRef<HTMLDivElement | null>(null);
  const sentencePopupRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const highlightCleanupRef = useRef<(() => void) | null>(null);
  const highlightOverlayRef = useRef<HTMLDivElement | null>(null);
  const { isRead, toggleRead } = useReadTracking({
    recordId: record.id,
    format: record.format,
    isAuthenticated: !!currentUserId,
  });

  const bookmarkFetcher = useFetcher<{ saved: boolean }>();
  const optimisticSaved = bookmarkFetcher.formData
    ? !initialIsSaved
    : initialIsSaved;

  const isRecordAuthor = currentUserId === record.authorId;
  const recordFormat = normalizeContentFormat(record.format);
  const isArticleRecord = recordFormat === "article";
  const hasSidebarContent = recordTags.length > 0 || linkedRecords.length > 0 || incomingLinks.length > 0 || participants.length > 0 || mentions.length > 0;

  const selfAnswersByQuestion = new Map<string, typeof selfAnswers>();
  for (const sa of selfAnswers) {
    const qid = sa.questionId;
    if (!selfAnswersByQuestion.has(qid)) {
      selfAnswersByQuestion.set(qid, []);
    }
    selfAnswersByQuestion.get(qid)!.push(sa);
  }

  const removeHighlight = useCallback(() => {
    highlightCleanupRef.current?.();
    highlightCleanupRef.current = null;
    savedRangeRef.current = null;
  }, []);

  const hideSentenceButton = useCallback(() => {
    removeHighlight();
    setSelectedText("");
    setShowSentenceButton(false);
    setButtonPosition({ x: 0, y: 0 });
  }, [removeHighlight]);

  const closeSentencePopup = useCallback(() => {
    removeHighlight();
    setShowSentencePopup(false);
    setSentenceReason("");
    setSelectedText("");
  }, [removeHighlight]);

  const applyHighlight = useCallback((range: Range) => {
    const overlayContainer = highlightOverlayRef.current;
    const articleContainer = articleContentRef.current;
    if (!overlayContainer || !articleContainer) return;

    overlayContainer.innerHTML = "";
    const containerRect = articleContainer.getBoundingClientRect();
    const rects = range.getClientRects();

    for (const rect of Array.from(rects)) {
      if (rect.width === 0 || rect.height === 0) continue;
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = `${rect.left - containerRect.left}px`;
      overlay.style.top = `${rect.top - containerRect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.backgroundColor = "rgba(108,196,214,0.25)";
      overlay.style.borderRadius = "2px";
      overlayContainer.appendChild(overlay);
    }

    highlightCleanupRef.current = () => {
      overlayContainer.innerHTML = "";
    };
  }, []);

  const openSentencePopup = useCallback(() => {
    setShowSentenceButton(false);
    setShowSentencePopup(true);
  }, []);

  const handleEditResponse = useCallback((responseId: string) => {
    const response = recordResponses.find(r => r.response.id === responseId);
    if (response) {
      setEditingResponseId(responseId);
      setEditingContent(parseResponseContent(response.response.content));
      setEditingResponseType(response.response.type);
    }
  }, [recordResponses]);

  const setEditingResponseIdWithReset = useCallback((id: string | null) => {
    setEditingResponseId(id);
    if (id === null) {
      setEditingContent(null);
      setEditingResponseType("");
    }
  }, []);

  const handleDeleteResponse = useCallback((responseId: string) => {
    submit({ intent: "delete_response", responseId }, { method: "post" });
  }, [submit]);

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

    removeHighlight();
    const range = selection.getRangeAt(0).cloneRange();
    savedRangeRef.current = range;
    applyHighlight(range);

    setSelectedText(normalizedText);
    setButtonPosition({
      x: Math.min(
        Math.max(rect.left + rect.width / 2, FLOATING_BUTTON_EDGE_PADDING),
        window.innerWidth - FLOATING_BUTTON_EDGE_PADDING,
      ),
      y: Math.max(rect.top - FLOATING_BUTTON_OFFSET, FLOATING_BUTTON_TOP_PADDING),
    });
    setShowSentenceButton(true);
  }, [hideSentenceButton, removeHighlight, applyHighlight]);

  const handleSentencePopupSave = useCallback(() => {
    if (!selectedText) return;

    const formData: Record<string, string> = {
      intent: "save_sentence",
      recordId: record.id,
      content: selectedText,
    };
    if (sentenceReason.trim()) {
      formData.reason = sentenceReason.trim();
    }

    submit(formData, { method: "post" });
    closeSentencePopup();
  }, [closeSentencePopup, record.id, selectedText, sentenceReason, submit]);

  useEffect(() => {
    const articleContentElement = articleContentRef.current;

    if (!articleContentElement) {
      return;
    }

    articleContentElement.addEventListener("mouseup", handleArticleMouseUp);

    return () => {
      articleContentElement.removeEventListener("mouseup", handleArticleMouseUp);
    };
  }, [handleArticleMouseUp]);

  useEffect(() => {
    if (!showSentenceButton || showSentencePopup || typeof document === "undefined") {
      return;
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (articleContentRef.current?.contains(target)) return;
      if (target.closest?.('button[aria-label="문장 저장하기"]')) return;
      hideSentenceButton();
    };

    const handleViewportChange = () => {
      hideSentenceButton();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [hideSentenceButton, showSentenceButton, showSentencePopup]);

  useEffect(() => {
    if (!showSentencePopup || typeof document === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSentencePopup();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (sentencePopupRef.current && !sentencePopupRef.current.contains(e.target as Node)) {
        closeSentencePopup();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSentencePopup, closeSentencePopup]);

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
          <li aria-hidden="true" className="text-text-tertiary">/</li>
          <li className="text-text-primary truncate max-w-[200px]" aria-current="page">
            {record.title}
          </li>
        </ol>
      </nav>

      <header className="mb-12">
        <div className="flex gap-2 mb-5 flex-wrap">
          <span className="text-caption px-3 py-1 rounded-full border border-border bg-surface text-text-secondary">
            {record.format === "note" ? "노트" : "글"}
          </span>
          <span className="text-caption px-3 py-1 rounded-full border border-border bg-surface text-text-secondary">
            {RECORD_TYPE_LABELS[record.type as RecordType] ?? record.type}
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
          <EditedIndicator
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            className="ml-1"
            revisions={isAuthorOrAdmin ? revisions : undefined}
          />
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

          {record.format === "article" && record.originalUrl ? (
            <a
              href={record.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#6E6E73] hover:text-[#146C94] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>원문: {(() => { try { return new URL(record.originalUrl).hostname; } catch { return record.originalUrl; } })()}</span>
            </a>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
              {currentUserId && (
                <bookmarkFetcher.Form method="post" action="/api/toggle-bookmark">
                  <input type="hidden" name="recordId" value={record.id} />
                  <button
                    type="submit"
                    aria-label={optimisticSaved ? "저장 취소" : "기록 저장"}
                    aria-pressed={optimisticSaved}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2",
                      optimisticSaved
                        ? "border-reef-cyan/40 bg-mist-blue text-ocean-blue hover:bg-mist-blue/70"
                        : "border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={optimisticSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                    {optimisticSaved ? "저장됨" : "저장"}
                  </button>
                </bookmarkFetcher.Form>
              )}

              {isArticleRecord && (
                <button
                  type="button"
                  onClick={toggleRead}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isRead
                      ? "border-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                      : "border-reef-cyan/40 bg-mist-blue text-ocean-blue hover:bg-mist-blue/70"
                  )}
                >
                  {isRead ? "읽지 않음으로 표시" : "읽음으로 표시"}
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
        </div>
      </header>

      <section className="mb-12 relative">
        <div ref={articleContentRef} className="relative">
          <ContentRenderer contentHtml={contentHtml} format={recordFormat} />
          <div ref={highlightOverlayRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
        </div>

        {showSentenceButton && selectedText && !showSentencePopup ? (
          <div
            className="fixed z-50 animate-in fade-in duration-150"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y,
              transform: "translateX(-50%)",
            }}
          >
            <button
              type="button"
              onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
              onTouchStart={(event) => event.stopPropagation()}
              onClick={openSentencePopup}
              aria-label="문장 저장하기"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-border bg-surface text-ocean-blue shadow-[0_8px_20px_rgba(11,36,71,0.10)] transition-all duration-normal hover:-translate-y-0.5 hover:border-reef-cyan/40 hover:bg-mist-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </button>
          </div>
        ) : null}
      </section>

      {isArticleRecord && references.length > 0 ? (
        <section aria-label="참조 및 출처" className="mb-12 border-t border-[#E3E8EF] pt-8">
          <h2 className="text-sm font-medium text-[#6E6E73] mb-4">참조 및 출처</h2>
          <ol className="space-y-2 list-none">
            {references.map((ref, index) => (
              <li key={ref.id} className="flex items-start gap-2">
                <span className="text-xs text-[#8C8C91] mt-0.5 shrink-0 w-5">{index + 1}.</span>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#1D1D1F] hover:text-[#146C94] transition-colors break-all"
                >
                  {ref.title || ref.url}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}



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
                            <SubmitButton
                              formDataMatch={{ intent: "create_self_answer" }}
                              loadingText="등록 중..."
                              className="rounded-full bg-deep-ocean text-white px-5 py-2.5 text-sm font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              답변 등록
                            </SubmitButton>
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
            <form method="post" className="flex flex-col gap-6 bg-surface rounded-2xl border border-border p-6 md:p-8">
              <input type="hidden" name="intent" value="create_response" />
              <input type="hidden" name="recordId" value={record.id} />
              <input type="hidden" name="type" value={selectedResponseType} />

              <fieldset className="border-0 m-0 p-0">
                <legend className="text-sm font-medium text-text-secondary mb-3 block">응답 유형</legend>
                <div className="flex flex-wrap gap-2">
                  {responseTypeOptions.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="response-type-radio"
                        value={option.value}
                        checked={selectedResponseType === option.value}
                        onChange={() => setSelectedResponseType(option.value)}
                        className="sr-only"
                      />
                      <span className={cn(
                        "inline-block px-4 py-2 rounded-full text-sm border transition-all",
                        selectedResponseType === option.value
                          ? "bg-deep-ocean text-white border-deep-ocean"
                          : "border-border text-text-secondary bg-surface hover:border-ocean-blue/30 hover:bg-mist-blue/30"
                      )}>
                        {option.shortLabel}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="response-visibility" className="text-sm font-medium text-text-secondary mb-2 block">
                  공개 범위
                </label>
                <Select name="visibility" defaultValue="public">
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
                <Label className="text-sm font-medium text-text-secondary mb-2 block">
                  내용
                </Label>
                <Suspense fallback={<div className="h-20 bg-[#F6F8FB] rounded-xl animate-pulse" />}>
                  <LazyResponseEditor
                    content={createContent ?? undefined}
                    onChange={(json: object) => setCreateContent(json)}
                    placeholder={RESPONSE_PLACEHOLDERS[selectedResponseType] ?? "이 기록에 응답해보세요."}
                  />
                </Suspense>
                <input
                  type="hidden"
                  name="content"
                  value={createContent ? JSON.stringify(createContent) : ""}
                />
              </div>

              <SubmitButton
                formDataMatch={{ intent: "create_response" }}
                loadingText="등록 중..."
                className="self-start rounded-full bg-deep-ocean px-7 py-3 text-[15px] font-medium text-white hover:bg-ocean-blue"
              >
                응답 등록
              </SubmitButton>
            </form>


          </div>
        </section>
      )}

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight mb-8">
            응답 {recordResponses.length}개
          </h2>
          {recordResponses.length > 0 ? (
            <div className="flex flex-col gap-6">
               {(() => {
                const responseTree = buildResponseTree<ResponseNode>(
                  recordResponses.map((r): ResponseNode => ({
                    id: r.response.id,
                    type: r.response.type,
                    content: r.response.content,
                    createdAt: r.response.createdAt,
                    updatedAt: r.response.updatedAt,
                    authorId: r.response.authorId,
                    moderationStatus: r.response.moderationStatus,
                    parentResponseId: r.response.parentResponseId ?? null,
                    contentHtml: r.response.contentHtml,
                    author: r.author,
                  }))
                );

                 return responseTree.map((rootNode) =>
                   renderResponseThread(rootNode, 0, {
                     editingResponseId,
                     editingContent,
                      editingResponseType,
                      setEditingContent,
                      setEditingResponseId: setEditingResponseIdWithReset,
                      setEditingResponseType,
                      handleEditResponse,
                      handleDeleteResponse,
                      replyingToId,
                      setReplyingToId,
                      replyResponseType,
                      setReplyResponseType,
                      replyContent,
                      setReplyContent,
                      currentUserId,
                      loaderData,
                      deletingResponseId,
                   })
                 );
              })()}
            </div>
          ) : (
            <EmptyState variant="responses" />
          )}
        </section>

        <IncomingResponseRefs refs={incomingResponseRefs} />



      

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

        {participants.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">함께한 사람</h3>
            <div className="flex flex-col gap-3">
              {(() => {
                const roleOrder = ["coauthor", "companion", "mentor"];
                const roleLabels: Record<string, string> = {
                  coauthor: "공동작성",
                  companion: "함께활동",
                  mentor: "멘토",
                };
                const roleColors: Record<string, string> = {
                  coauthor: "text-ocean-blue",
                  companion: "text-text-secondary",
                  mentor: "text-reef-cyan",
                };

                const grouped = participants.reduce((acc, p) => {
                  const role = p.role || "companion";
                  if (!acc[role]) acc[role] = [];
                  acc[role].push(p);
                  return acc;
                }, {} as Record<string, typeof participants>);

                return roleOrder
                  .filter((role) => grouped[role]?.length > 0)
                  .map((role) => (
                    <div key={role}>
                      <p className="text-xs font-medium text-text-tertiary mb-2">{roleLabels[role]}</p>
                      <div className="flex flex-wrap gap-2">
                        {grouped[role].map((participant) => (
                          participant.slug ? (
                            <Link
                              key={participant.userId}
                              to={`/learners/${participant.slug}`}
                              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border hover:border-reef-cyan/40 hover:bg-mist-blue/30 transition-all no-underline"
                            >
                              {participant.profilePhotoUrl ? (
                                <img
                                  src={participant.profilePhotoUrl}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-text-secondary">
                                  {participant.displayName?.charAt(0) ?? "?"}
                                </span>
                              )}
                              <span className="text-sm text-text-primary group-hover:text-ocean-blue transition-colors">
                                {participant.displayName ?? "알 수 없음"}
                              </span>
                            </Link>
                          ) : (
                            <span
                              key={participant.userId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border"
                            >
                              {participant.profilePhotoUrl ? (
                                <img
                                  src={participant.profilePhotoUrl}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-text-secondary">
                                  {participant.displayName?.charAt(0) ?? "?"}
                                </span>
                              )}
                              <span className="text-sm text-text-primary">
                                {participant.displayName ?? "알 수 없음"}
                              </span>
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}

        {mentions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">언급된 사람</h3>
            <div className="flex flex-wrap gap-2">
              {mentions.map((mention) => (
                mention.slug ? (
                  <Link
                    key={mention.mentionId}
                    to={`/learners/${mention.slug}`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border hover:border-reef-cyan/40 hover:bg-mist-blue/30 transition-all no-underline"
                  >
                    {mention.profilePhotoUrl ? (
                      <img
                        src={mention.profilePhotoUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-text-secondary">
                        {mention.displayName?.charAt(0) ?? "?"}
                      </span>
                    )}
                    <span className="text-sm text-text-primary group-hover:text-ocean-blue transition-colors">
                      {mention.displayName ?? "알 수 없음"}
                    </span>
                  </Link>
                ) : (
                  <span
                    key={mention.mentionId}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border"
                  >
                    {mention.profilePhotoUrl ? (
                      <img
                        src={mention.profilePhotoUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-text-secondary">
                        {mention.displayName?.charAt(0) ?? "?"}
                      </span>
                    )}
                    <span className="text-sm text-text-primary">
                      {mention.displayName ?? "알 수 없음"}
                    </span>
                  </span>
                )
              ))}
            </div>
          </div>
        )}
      </aside>
      )}

      {showSentencePopup && selectedText ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.12)" }}>
          <div
            ref={sentencePopupRef}
            className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-lg p-6 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-label="문장 저장"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-4">문장 저장하기</h3>

            <blockquote className="border-l-2 border-reef-cyan pl-4 py-2 mb-5 text-base text-text-primary leading-relaxed line-clamp-6">
              {selectedText}
            </blockquote>

            <div className="mb-5">
              <Label htmlFor="popup-sentence-reason" className="text-sm font-medium text-text-secondary mb-2 block">
                이 문장을 남기는 이유 (선택)
              </Label>
              <Textarea
                id="popup-sentence-reason"
                value={sentenceReason}
                onChange={(e) => setSentenceReason(e.target.value)}
                rows={2}
                placeholder="왜 이 문장이 남았는지 적어보세요."
                className="bg-surface-secondary"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={closeSentencePopup}
                className="rounded-full px-5 py-2.5 text-sm border border-border bg-transparent text-text-secondary cursor-pointer transition-all duration-normal hover:border-text-secondary/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
              >
                취소
              </Button>
              <SubmitButton
                type="button"
                formDataMatch={{ intent: "save_sentence" }}
                loadingText="저장 중..."
                onClick={handleSentencePopupSave}
                className="rounded-full bg-deep-ocean px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 disabled:opacity-60"
              >
                저장하기
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const capturedSignatureRef = useRef<string | null>(null);
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const errorSignature = isRouteErrorResponse(error)
    ? `route:${error.status}:${error.statusText}:${String(error.data ?? "")}`
    : error instanceof Error
      ? `error:${error.name}:${error.message}:${error.stack ?? ""}`
      : `unknown:${String(error)}`;

  useEffect(() => {
    if (capturedSignatureRef.current === errorSignature) {
      return;
    }
    capturedSignatureRef.current = errorSignature;

    const url = typeof window !== "undefined" ? window.location.href : "unknown";

    if (isRouteErrorResponse(error)) {
      Sentry.captureMessage(`RecordDetail RouteError ${error.status}: ${url}`, {
        level: error.status >= 500 ? "error" : "warning",
        tags: {
          type: "route_error",
          route: "public/logs/$recordSlug",
          status: String(error.status),
        },
        extra: {
          url,
          status: error.status,
          statusText: error.statusText,
          data: error.data,
        },
      });
      return;
    }

    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          type: "render_error",
          route: "public/logs/$recordSlug",
        },
        extra: { url },
      });
      return;
    }

    Sentry.captureMessage("RecordDetail unknown error boundary payload", {
      level: "error",
      tags: {
        type: "render_error",
        route: "public/logs/$recordSlug",
      },
      extra: {
        url,
        payload: String(error),
      },
    });
  }, [error, errorSignature]);

  const title = isNotFound
    ? "기록을 찾을 수 없습니다"
    : "기록을 불러오는 중 문제가 생겼습니다";

  const description = isNotFound
    ? "삭제되었거나 존재하지 않는 기록입니다."
    : "잠시 후 다시 시도해주세요.";

  return (
    <div className="text-center py-16 px-4 max-w-reading mx-auto">
      <p className="text-xl font-semibold text-text-primary mb-3">{title}</p>
      <p className="text-base text-text-secondary mb-8">{description}</p>
      <Link to="/logs" className="inline-block rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium hover:bg-ocean-blue transition-all shadow-sm hover:shadow-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2">
        기록 목록으로
      </Link>
    </div>
  );
}
