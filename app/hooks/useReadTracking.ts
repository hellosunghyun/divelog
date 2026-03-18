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

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    if (format !== "article") {
      return;
    }

    const timeout = setTimeout(() => {
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
      clearTimeout(timeout);
    };
  }, [format, recordId]);

  const unmarkRead = useCallback(() => {
    if (format !== "article") {
      return;
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
