/**
 * Client-side read tracking storage utility using localStorage
 * Stores which article records the user has read
 */

const STORAGE_KEY = 'divelog-reads';
const SYNC_FLAG_KEY = 'divelog-reads-synced';
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const TTL_MS = TTL_SECONDS * 1000;
const MAX_ENTRIES = 500;

type ReadMap = Record<string, number>; // recordId → unixepoch timestamp (seconds)

/**
 * Load reads map from localStorage, cleaning up expired entries
 * @returns Object mapping recordId to read timestamp (unix seconds)
 */
export function getLocalReads(): ReadMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const reads: ReadMap = JSON.parse(stored);
    const now = Math.floor(Date.now() / 1000);

    // Filter out expired entries
    const filtered: ReadMap = {};
    for (const [recordId, timestamp] of Object.entries(reads)) {
      if (now - timestamp <= TTL_SECONDS) {
        filtered[recordId] = timestamp;
      }
    }

    // If we removed entries, update storage
    if (Object.keys(filtered).length < Object.keys(reads).length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        // Silently fail if storage write fails
      }
    }

    return filtered;
  } catch {
    // Silently fail if localStorage is unavailable or JSON parse fails
    return {};
  }
}

/**
 * Mark a record as read in localStorage
 * @param recordId - The record ID to mark as read
 */
export function markLocalRead(recordId: string): void {
  try {
    const reads = getLocalReads();
    const now = Math.floor(Date.now() / 1000);

    reads[recordId] = now;

    // Enforce size cap: if over limit, remove oldest entries
    if (Object.keys(reads).length > MAX_ENTRIES) {
      const entries = Object.entries(reads).sort((a, b) => a[1] - b[1]);
      const toKeep = entries.slice(-(MAX_ENTRIES - 1));
      const newReads: ReadMap = {};
      for (const [id, timestamp] of toKeep) {
        newReads[id] = timestamp;
      }
      newReads[recordId] = now;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newReads));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reads));
    }
  } catch {
    // Silently fail if localStorage is unavailable or quota exceeded
  }
}

/**
 * Unmark a record as read in localStorage
 * @param recordId - The record ID to unmark
 */
export function unmarkLocalRead(recordId: string): void {
  try {
    const reads = getLocalReads();
    delete reads[recordId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reads));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clear all read records from localStorage
 */
export function clearLocalReads(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Check if a record is marked as read
 * @param recordId - The record ID to check
 * @returns true if the record is marked as read, false otherwise
 */
export function isLocalRead(recordId: string): boolean {
  const reads = getLocalReads();
  return recordId in reads;
}

/**
 * Get all read record IDs as a Set
 * @returns Set of record IDs that have been read
 */
export function getLocalReadIds(): Set<string> {
  const reads = getLocalReads();
  return new Set(Object.keys(reads));
}

/**
 * Extract all reads for DB sync and clear localStorage.
 * Call this after successful DB sync.
 * @returns Array of read records with recordId and readAt timestamp (unix seconds)
 */
export function popLocalReadsForSync(): { recordId: string; readAt: number }[] {
  try {
    const reads = getLocalReads();
    const result = Object.entries(reads).map(([recordId, readAt]) => ({
      recordId,
      readAt,
    }));

    // Clear storage after extracting
    localStorage.removeItem(STORAGE_KEY);

    return result;
  } catch {
    // Silently fail if localStorage is unavailable
    return [];
  }
}

/**
 * Check if sync has been performed for current session
 * @returns true if sync flag is set, false otherwise
 */
export function hasSyncedThisSession(): boolean {
  try {
    const flag = sessionStorage.getItem(SYNC_FLAG_KEY);
    return flag === 'true';
  } catch {
    // Silently fail if sessionStorage is unavailable
    return false;
  }
}

/**
 * Mark sync as done for current session
 */
export function markSyncedThisSession(): void {
  try {
    sessionStorage.setItem(SYNC_FLAG_KEY, 'true');
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}
