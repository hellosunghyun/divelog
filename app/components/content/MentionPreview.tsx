import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import { createPortal } from "react-dom";

type PreviewType = "learner" | "record";

interface PreviewTarget {
  type: PreviewType;
  slug: string;
  rect: DOMRect;
}

interface LearnerPreviewData {
  slug: string;
  displayName: string;
  profilePhotoUrl: string | null;
  cohort: string | null;
  bio: string | null;
  currentQuestion: string | null;
  stageName: string | null;
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
  stageName: string | null;
}

const previewCache = new Map<string, LearnerPreviewData | RecordPreviewData>();

function cacheKey(type: PreviewType, slug: string) {
  return `${type}:${slug}`;
}

async function fetchPreview(
  type: PreviewType,
  slug: string,
): Promise<LearnerPreviewData | RecordPreviewData | null> {
  const key = cacheKey(type, slug);
  const cached = previewCache.get(key);
  if (cached) return cached;

  const endpoint =
    type === "learner" ? "/api/preview-learner" : "/api/preview-record";

  try {
    const res = await fetch(`${endpoint}?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    previewCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

const CARD_WIDTH = 300;
const CARD_MAX_HEIGHT = 260;
const GAP = 8;

function calculatePosition(rect: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
  if (left + CARD_WIDTH > vw - GAP) left = vw - CARD_WIDTH - GAP;
  if (left < GAP) left = GAP;

  let top: number;

  if (rect.bottom + GAP + CARD_MAX_HEIGHT < vh) {
    top = rect.bottom + GAP;
  } else {
    top = rect.top - CARD_MAX_HEIGHT - GAP;
  }

  return { top, left };
}

export function useMentionPreview(containerRef: RefObject<HTMLDivElement | null>) {
  const [target, setTarget] = useState<PreviewTarget | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const cardRef = useRef<HTMLDivElement>(null);

  const clearAll = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setTarget(null), 200);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onEnter(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        ".user-mention, .record-ref",
      );
      if (!anchor) return;

      clearAll();

      const type: PreviewType = anchor.classList.contains("user-mention")
        ? "learner"
        : "record";
      const href = anchor.getAttribute("href") ?? "";
      const slug = href.split("/").filter(Boolean).pop() ?? "";
      if (!slug) return;

      showTimer.current = setTimeout(() => {
        setTarget({ type, slug, rect: anchor.getBoundingClientRect() });
      }, 300);
    }

    function onLeave(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        ".user-mention, .record-ref",
      );
      if (!anchor) return;
      if (showTimer.current) clearTimeout(showTimer.current);
      scheduleHide();
    }

    container.addEventListener("mouseenter", onEnter, true);
    container.addEventListener("mouseleave", onLeave, true);

    return () => {
      container.removeEventListener("mouseenter", onEnter, true);
      container.removeEventListener("mouseleave", onLeave, true);
      clearAll();
    };
  }, [containerRef, clearAll, scheduleHide]);

  return { target, cardRef, cancelHide, scheduleHide, close: () => setTarget(null) };
}

export function MentionPreviewPortal({
  target,
  cardRef,
  onMouseEnter,
  onMouseLeave,
}: {
  target: PreviewTarget;
  cardRef: RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [data, setData] = useState<LearnerPreviewData | RecordPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pos = calculatePosition(target.rect);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const cached = previewCache.get(cacheKey(target.type, target.slug));
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    fetchPreview(target.type, target.slug).then((result) => {
      if (cancelled) return;
      if (result) {
        setData(result);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [target.type, target.slug]);

  if (error) return null;

  return createPortal(
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="tooltip"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: CARD_WIDTH,
        zIndex: 9999,
      }}
      className="animate-in fade-in-0 zoom-in-95 duration-150 rounded-2xl border border-border bg-surface shadow-lg"
    >
      {loading ? (
        <PreviewSkeleton />
      ) : data && target.type === "learner" ? (
        <LearnerPreviewCard data={data as LearnerPreviewData} />
      ) : data && target.type === "record" ? (
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
  const meta = [data.cohort, data.stageName].filter(Boolean).join(" · ");

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
            {data.displayName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-text-primary">
            {data.displayName}
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
  const meta = [formatLabel, data.stageName].filter(Boolean).join(" · ");
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
