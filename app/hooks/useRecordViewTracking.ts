import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";

const VIEWER_KEY_STORAGE_KEY = "divelog-viewer-key";
const VIEWED_RECORDS_STORAGE_KEY = "divelog-viewed-records";

function createViewerKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getViewerKey() {
  if (typeof window === "undefined") return null;

  const existing = localStorage.getItem(VIEWER_KEY_STORAGE_KEY);
  if (existing) return existing;

  const next = createViewerKey();
  localStorage.setItem(VIEWER_KEY_STORAGE_KEY, next);
  return next;
}

function getViewedRecordSet() {
  if (typeof window === "undefined") return new Set<string>();

  const raw = sessionStorage.getItem(VIEWED_RECORDS_STORAGE_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

function markRecordViewed(recordId: string) {
  if (typeof window === "undefined") return;

  const viewed = getViewedRecordSet();
  viewed.add(recordId);
  sessionStorage.setItem(VIEWED_RECORDS_STORAGE_KEY, JSON.stringify(Array.from(viewed)));
}

export function useRecordViewTracking(recordId: string, initialCount: number) {
  const fetcher = useFetcher<{ counted?: boolean }>();
  const [viewCount, setViewCount] = useState(initialCount);

  useEffect(() => {
    setViewCount(initialCount);
  }, [initialCount, recordId]);

  const alreadyViewed = useMemo(() => {
    if (typeof window === "undefined") return true;
    return getViewedRecordSet().has(recordId);
  }, [recordId]);

  useEffect(() => {
    if (typeof window === "undefined" || alreadyViewed) {
      return;
    }

    const viewerKey = getViewerKey();
    if (!viewerKey) {
      return;
    }

    markRecordViewed(recordId);
    fetcher.submit(
      { recordId, viewerKey },
      { method: "POST", action: "/api/track-view" },
    );
  }, [alreadyViewed, fetcher, recordId]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }

    if (fetcher.data.counted) {
      setViewCount((current) => current + 1);
    }
  }, [fetcher.data, fetcher.state]);

  return { viewCount };
}
