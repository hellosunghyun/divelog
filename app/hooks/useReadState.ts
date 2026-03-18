import { useEffect, useRef, useState, useCallback } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import {
  getLocalReadIds,
  getLocalReads,
  clearLocalReads,
  hasSyncedThisSession,
  markSyncedThisSession,
} from "~/lib/infra/read-storage";

interface PublicLoaderData {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    isAdmin: boolean;
  } | null;
}

interface ReadStateData {
  readIds: string[];
}

interface UseReadStateResult {
  isRead: (recordId: string) => boolean;
  isLoading: boolean;
}

export function useReadState(recordIds: string[]): UseReadStateResult {
  const data = useRouteLoaderData("routes/_public") as PublicLoaderData | undefined;
  const fetcher = useFetcher<ReadStateData>();
  const syncFetcher = useFetcher();

  const isAuthenticated = data?.isAuthenticated ?? false;
  const userId = data?.user?.id;
  const recordIdsKey = recordIds.join(",");
  const hasRecordIds = recordIdsKey.length > 0;

  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const syncedRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const syncFetcherRef = useRef(syncFetcher);
  syncFetcherRef.current = syncFetcher;

  const refreshLocalReads = useCallback(() => {
    if (isAuthenticated) return;
    const ids = recordIdsKey ? recordIdsKey.split(",") : [];
    const localReadIds = getLocalReadIds();
    const filtered = ids.filter((id) => localReadIds.has(id));
    setReadSet((prev: Set<string>) => {
      if (prev.size === filtered.length && filtered.every((id) => prev.has(id))) {
        return prev;
      }
      return new Set(filtered);
    });
  }, [isAuthenticated, recordIdsKey]);

  useEffect(() => {
    if (isAuthenticated) return;
    function handleVisibility() {
      if (document.visibilityState === "visible") refreshLocalReads();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refreshLocalReads);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refreshLocalReads);
    };
  }, [isAuthenticated, refreshLocalReads]);

  useEffect(() => {
    if (!isAuthenticated || !userId || syncedRef.current) {
      return;
    }

    if (hasSyncedThisSession()) {
      syncedRef.current = true;
      return;
    }

    const reads = getLocalReads();
    const entries = Object.entries(reads).map(([recordId, readAt]) => ({ recordId, readAt }));

    if (entries.length === 0) {
      markSyncedThisSession();
      syncedRef.current = true;
      return;
    }

    syncFetcherRef.current.submit(
      {
        intent: "sync_reads",
        entries: JSON.stringify(entries),
      },
      {
        method: "POST",
        action: "/api/track-read",
      }
    );

    markSyncedThisSession();
    syncedRef.current = true;
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (syncFetcher.data && "success" in syncFetcher.data) {
      clearLocalReads();
    }
  }, [syncFetcher.data]);

  useEffect(() => {
    if (isAuthenticated && hasRecordIds) {
      setIsLoading(true);
      fetcherRef.current.load(`/api/track-read?ids=${encodeURIComponent(recordIdsKey)}`);
      return;
    }

    if (!isAuthenticated) {
      refreshLocalReads();
    }
  }, [isAuthenticated, hasRecordIds, recordIdsKey, refreshLocalReads]);

  useEffect(() => {
    if (fetcher.data?.readIds) {
      setReadSet(new Set(fetcher.data.readIds));
      setIsLoading(false);
      return;
    }

    if (fetcher.state === "idle" && isLoading) {
      setIsLoading(false);
    }
  }, [fetcher.data, fetcher.state, isLoading]);

  return {
    isRead: (recordId: string) => readSet.has(recordId),
    isLoading,
  };
}
