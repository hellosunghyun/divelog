import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { saveDraftToLocal } from "~/lib/draft-storage";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAutosaveOptions {
  format: "note" | "article";
  getFormData: () => {
    content: string;
    title?: string;
    contentJson?: string;
    stageId?: string | null;
    rhythm?: string;
    visibility?: string;
    responsePreference?: string;
  };
  enabled?: boolean;
  debounceMs?: number;
}

export interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
}

export function useAutosave(options: UseAutosaveOptions): AutosaveState {
  const { format, getFormData, enabled = true, debounceMs = 3000 } = options;

  const fetcher = useFetcher();
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSnapshotRef = useRef<string>("");

  // Determine status based on fetcher state
  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    if (fetcher.state === "submitting") {
      setStatus("saving");
    } else if (fetcher.state === "idle") {
      if (fetcher.data?.error) {
        setStatus("error");
      } else if (fetcher.data?.updatedAt) {
        setStatus("saved");
        setLastSavedAt(new Date(fetcher.data.updatedAt));
      } else {
        setStatus("idle");
      }
    }
  }, [fetcher.state, fetcher.data, enabled]);

  // Handle content changes with debounce
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const formData = getFormData();
    const currentContent = formData.content;

    // Don't save empty content
    if (!currentContent || currentContent.trim() === "") {
      if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        previousSnapshotRef.current = "";
        setStatus("idle");
        return;
      }

    const snapshot = JSON.stringify({
      format,
      title: formData.title ?? "",
      content: currentContent,
      contentJson: formData.contentJson ?? "",
      stageId: formData.stageId ?? null,
      rhythm: formData.rhythm ?? "free",
      visibility: formData.visibility ?? "draft",
      responsePreference: formData.responsePreference ?? "open",
    });

    if (snapshot === previousSnapshotRef.current) {
      return;
    }

    previousSnapshotRef.current = snapshot;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Save to local storage immediately
    saveDraftToLocal(format, {
      title: formData.title,
      content: currentContent,
      contentJson: formData.contentJson,
      stageId: formData.stageId,
      rhythm: formData.rhythm,
      visibility: (formData.visibility as "draft" | "cohort" | "public") || "draft",
      responsePreference: (formData.responsePreference as "open" | "question_only" | "closed") || "open",
    });

    // Debounce server save
    timeoutRef.current = setTimeout(() => {
      const latestFormData = getFormData();

      // Double-check content is not empty before submitting
      if (!latestFormData.content || latestFormData.content.trim() === "") {
        return;
      }

      fetcher.submit(
        {
          format,
          title: latestFormData.title || "",
          content: latestFormData.content,
          contentJson: latestFormData.contentJson || "",
          stageId: latestFormData.stageId || "",
          rhythm: latestFormData.rhythm || "",
          visibility: latestFormData.visibility || "draft",
          responsePreference: latestFormData.responsePreference || "open",
        },
        { method: "POST", action: "/api/autosave" }
      );

      timeoutRef.current = null;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [format, getFormData, enabled, debounceMs, fetcher]);

  return {
    status,
    lastSavedAt,
  };
}
