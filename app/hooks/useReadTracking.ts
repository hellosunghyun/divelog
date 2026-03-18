import { useCallback, useEffect, useRef } from "react";
import { useFetcher } from "react-router";

import {
  markLocalRead,
  unmarkLocalRead,
  addToSessionReadCache,
  removeFromSessionReadCache,
} from "~/lib/infra/read-storage";

interface UseReadTrackingOptions {
  recordId: string;
  format: string;
  isAuthenticated: boolean;
}

interface UseReadTrackingResult {
  unmarkRead: () => void;
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

  useEffect(() => {
    skipAutoMarkRef.current = false;

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
    }, 3000);

    return () => {
      if (markTimeoutRef.current) {
        clearTimeout(markTimeoutRef.current);
        markTimeoutRef.current = null;
      }
    };
  }, [format, recordId]);

  const unmarkRead = useCallback(() => {
    if (format !== "article") {
      return;
    }

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
      return;
    }

    unmarkLocalRead(recordId);
  }, [format, recordId]);

  return { unmarkRead };
}
