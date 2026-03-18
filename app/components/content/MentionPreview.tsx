import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import { createPortal } from "react-dom";

type PreviewType = "learner" | "record";

interface PreviewInfo {
  type: PreviewType;
  slug: string;
  userId?: string;
}

interface LearnerPreviewData {
  slug: string;
  displayName: string;
  profilePhotoUrl: string | null;
  cohort: string | null;
  bio: string | null;
  currentQuestion: string | null;
}

interface RecordPreviewData {
  slug: string;
  title: string;
  excerpt: string | null;
  format: string;
  type: string;
  rhythm: string;
  createdAt: number;
  authorDisplayName: string | null;
  authorSlug: string | null;
  authorPhotoUrl: string | null;
}

const previewCache = new Map<string, LearnerPreviewData | RecordPreviewData>();

function cacheKey(type: PreviewType, slug: string) {
  return `${type}:${slug}`;
}

async function fetchPreview(
  type: PreviewType,
  slug: string,
  userId?: string,
): Promise<LearnerPreviewData | RecordPreviewData | null> {
  const key = cacheKey(type, slug);
  const cached = previewCache.get(key);
  if (cached) return cached;

  const endpoint =
    type === "learner" ? "/api/preview-learner" : "/api/preview-record";

  const lookupSlug = userId && type === "learner" ? userId : slug;

  try {
    const res = await fetch(`${endpoint}?slug=${encodeURIComponent(lookupSlug)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as LearnerPreviewData | RecordPreviewData;
    previewCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

const CARD_WIDTH = 300;
const GAP = 8;

function calculatePosition(rect: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
  if (left + CARD_WIDTH > vw - GAP) left = vw - CARD_WIDTH - GAP;
  if (left < GAP) left = GAP;

  const estimatedHeight = 200;
  const top =
    rect.bottom + GAP + estimatedHeight < vh
      ? rect.bottom + GAP
      : rect.top - estimatedHeight - GAP;

  return { top, left };
}

const MENTION_SELECTOR = ".user-mention, .record-ref";

function parseAnchor(anchor: HTMLAnchorElement): PreviewInfo | null {
  const type: PreviewType = anchor.classList.contains("user-mention")
    ? "learner"
    : "record";
  const href = anchor.getAttribute("href") ?? "";
  const slug = href.split("/").filter(Boolean).pop() ?? "";
  if (!slug) return null;
  const userId = type === "learner"
    ? anchor.getAttribute("data-user-id") ?? undefined
    : undefined;
  return { type, slug, userId };
}

export function useMentionPreview(containerRef: RefObject<HTMLDivElement | null>) {
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
  const overAnchor = useRef(false);
  const overCard = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPreviewKey = useRef<string>("");

  const tryHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!overAnchor.current && !overCard.current) {
        setOpen(false);
        currentPreviewKey.current = "";
      }
    }, 300);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onOver(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(MENTION_SELECTOR);
      if (!anchor || !container!.contains(anchor)) return;

      overAnchor.current = true;
      cancelHide();

      const info = parseAnchor(anchor);
      if (!info) return;

      const key = cacheKey(info.type, info.slug);
      if (key === currentPreviewKey.current) return;

      currentPreviewKey.current = key;
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => {
        setPreview(info);
        setPos(calculatePosition(anchor.getBoundingClientRect()));
        setOpen(true);
      }, 350);
    }

    function onOut(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(MENTION_SELECTOR);
      if (!anchor) return;

      const related = e.relatedTarget as HTMLElement | null;
      if (related && anchor.contains(related)) return;

      overAnchor.current = false;

      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
        currentPreviewKey.current = "";
      }
      tryHide();
    }

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(MENTION_SELECTOR);
      if (!anchor || !container!.contains(anchor)) return;
      if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
      currentPreviewKey.current = "";
      overAnchor.current = false;
      overCard.current = false;
      setOpen(false);
    }

    container.addEventListener("mouseover", onOver);
    container.addEventListener("mouseout", onOut);
    container.addEventListener("click", onClick);

    return () => {
      container.removeEventListener("mouseover", onOver);
      container.removeEventListener("mouseout", onOut);
      container.removeEventListener("click", onClick);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [containerRef, cancelHide, tryHide]);

  const onCardEnter = useCallback(() => {
    overCard.current = true;
    cancelHide();
  }, [cancelHide]);

  const onCardLeave = useCallback(() => {
    overCard.current = false;
    tryHide();
  }, [tryHide]);

  return { preview, open, pos, cardRef, onCardEnter, onCardLeave };
}

export function MentionPreviewCard({
  preview,
  open,
  pos,
  cardRef,
  onCardEnter,
  onCardLeave,
}: {
  preview: PreviewInfo | null;
  open: boolean;
  pos: { top: number; left: number };
  cardRef: RefObject<HTMLDivElement | null>;
  onCardEnter: () => void;
  onCardLeave: () => void;
}) {
  const [data, setData] = useState<LearnerPreviewData | RecordPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const lastKey = useRef<string>("");

  const previewType = preview?.type;
  const previewSlug = preview?.slug;
  const previewUserId = preview?.userId;

  useEffect(() => {
    if (!previewType || !previewSlug) return;
    const key = cacheKey(previewType, previewSlug);
    if (key === lastKey.current) return;
    lastKey.current = key;

    const cached = previewCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);
    fetchPreview(previewType, previewSlug, previewUserId).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [previewType, previewSlug, previewUserId]);

  if (typeof document === "undefined") return null;

  const visible = open && preview && (loading || !!data);

  const handleCardClick = () => {
    if (!preview || !data) return;
    const href = preview.type === "learner"
      ? `/learners/${preview.slug}`
      : `/logs/${preview.slug}`;
    window.location.href = href;
  };

  return createPortal(
    <div
      ref={cardRef}
      onMouseEnter={onCardEnter}
      onMouseLeave={onCardLeave}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleCardClick(); }}
      role="tooltip"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: CARD_WIDTH,
        zIndex: 9999,
        cursor: data ? "pointer" : "default",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "scale(1)" : "scale(0.97)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}
      className="rounded-2xl border border-border bg-surface shadow-lg"
    >
      {loading ? (
        <PreviewSkeleton />
      ) : data && preview?.type === "learner" ? (
        <LearnerPreviewCard data={data as LearnerPreviewData} />
      ) : data && preview?.type === "record" ? (
        <RecordPreviewCard data={data as RecordPreviewData} />
      ) : null}
    </div>,
    document.body,
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-surface-secondary" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-surface-secondary" />
          <div className="h-3 w-16 animate-pulse rounded bg-surface-secondary" />
        </div>
      </div>
      <div className="h-3 w-full animate-pulse rounded bg-surface-secondary" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-surface-secondary" />
    </div>
  );
}

function LearnerPreviewCard({ data }: { data: LearnerPreviewData }) {
  const meta = [data.cohort].filter(Boolean).join(" · ");

  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        {data.profilePhotoUrl ? (
          <img
            src={data.profilePhotoUrl}
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-secondary text-sm font-medium text-text-secondary">
            {data.displayName?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-text-primary">
            {data.displayName ?? "알 수 없음"}
          </p>
          {meta && (
            <p className="truncate text-xs text-text-tertiary">{meta}</p>
          )}
        </div>
      </div>

      {data.bio && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
          {data.bio}
        </p>
      )}

      {data.currentQuestion && (
        <div className="mt-3 rounded-lg bg-mist-blue/40 px-3 py-2">
          <p className="text-[11px] font-medium tracking-wide text-text-tertiary">
            탐구 중인 질문
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-text-primary">
            {data.currentQuestion}
          </p>
        </div>
      )}
    </div>
  );
}

const FORMAT_LABEL: Record<string, string> = {
  note: "노트",
  article: "아티클",
};

function RecordPreviewCard({ data }: { data: RecordPreviewData }) {
  const formatLabel = FORMAT_LABEL[data.format] ?? data.format;
  const meta = [formatLabel].filter(Boolean).join(" · ");
  const dateStr = new Date(data.createdAt * 1000).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="p-5">
      {meta && (
        <p className="text-[11px] font-medium tracking-wide text-text-tertiary">
          {meta}
        </p>
      )}

      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
        {data.title}
      </p>

      {data.excerpt && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-text-secondary">
          {data.excerpt}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {data.authorPhotoUrl ? (
          <img
            src={data.authorPhotoUrl}
            alt=""
            className="h-5 w-5 flex-shrink-0 rounded-full border border-border object-cover"
          />
        ) : data.authorDisplayName ? (
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-medium text-text-tertiary">
            {data.authorDisplayName.charAt(0)}
          </div>
        ) : null}
        <p className="truncate text-xs text-text-tertiary">
          {data.authorDisplayName ?? "익명"}
          <span className="mx-1 text-border">·</span>
          {dateStr}
        </p>
      </div>
    </div>
  );
}
