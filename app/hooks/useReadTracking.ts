import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import {
  markLocalRead,
  unmarkLocalRead,
  isLocalRead,
  addToSessionReadCache,
  removeFromSessionReadCache,
  getSessionReadCache,
} from "~/lib/infra/read-storage";

interface UseReadTrackingOptions {
  recordId: string;
  format: string;
  isAuthenticated: boolean;
}

interface UseReadTrackingResult {
  isRead: boolean;
  toggleRead: () => void;
}

function getInitialReadState(recordId: string, isAuthenticated: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isAuthenticated) {
    const cache = getSessionReadCache();
    return cache ? cache.has(recordId) : false;
  }
  return isLocalRead(recordId);
}

export function useReadTracking({
  recordId,
  format,
  isAuthenticated,
}: UseReadTrackingOptions): UseReadTrackingResult {
  const fetcher = useFetcher();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const markTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoMarkRef = useRef(false);

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const [isRead, setIsRead] = useState(() =>
    getInitialReadState(recordId, isAuthenticated)
  );

  useEffect(() => {
    skipAutoMarkRef.current = false;
    setIsRead(getInitialReadState(recordId, isAuthenticated));

    if (format !== "article") {
      return;
    }

    markTimeoutRef.current = setTimeout(() => {
      if (skipAutoMarkRef.current) {
        return;
      }

      if (isAuthenticatedRef.current) {
        fetcherRef.current.submit(
          { intent: "mark_read", recordId },
          { method: "POST", action: "/api/track-read" }
        );
        addToSessionReadCache(recordId);
      } else {
        markLocalRead(recordId);
      }
      setIsRead(true);
    }, 3000);

    return () => {
      if (markTimeoutRef.current) {
        clearTimeout(markTimeoutRef.current);
        markTimeoutRef.current = null;
      }
    };
  }, [format, recordId, isAuthenticated]);

  const toggleRead = useCallback(() => {
    if (format !== "article") {
      return;
    }

    if (isRead) {
      skipAutoMarkRef.current = true;

      if (markTimeoutRef.current) {
        clearTimeout(markTimeoutRef.current);
        markTimeoutRef.current = null;
      }

      if (isAuthenticatedRef.current) {
        fetcherRef.current.submit(
          { intent: "unmark_read", recordId },
          { method: "POST", action: "/api/track-read" }
        );
        removeFromSessionReadCache(recordId);
      } else {
        unmarkLocalRead(recordId);
      }
      setIsRead(false);
    } else {
      skipAutoMarkRef.current = false;

      if (isAuthenticatedRef.current) {
        fetcherRef.current.submit(
          { intent: "mark_read", recordId },
          { method: "POST", action: "/api/track-read" }
        );
        addToSessionReadCache(recordId);
      } else {
        markLocalRead(recordId);
      }
      setIsRead(true);
    }
  }, [format, recordId, isRead]);

  return { isRead, toggleRead };
}
