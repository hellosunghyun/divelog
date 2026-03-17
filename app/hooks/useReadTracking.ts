import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";

import {
  markLocalRead,
  unmarkLocalRead,
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noopUnmarkRead = () => {};

  useEffect(() => {
    if (format !== "article") {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (isAuthenticated) {
        fetcher.submit(
          { intent: "mark_read", recordId },
          { method: "POST", action: "/api/track-read" }
        );
      } else {
        markLocalRead(recordId);
      }

      timeoutRef.current = null;
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [fetcher, format, isAuthenticated, recordId]);

  if (format !== "article") {
    return { unmarkRead: noopUnmarkRead };
  }

  const unmarkRead = () => {
    if (isAuthenticated) {
      fetcher.submit(
        { intent: "unmark_read", recordId },
        { method: "POST", action: "/api/track-read" }
      );
      return;
    }

    unmarkLocalRead(recordId);
  };

  return { unmarkRead };
}
