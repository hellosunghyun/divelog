/**
 * Client-side draft storage utility using localStorage
 * Provides temporary save/recovery for note and article drafts
 */

export interface DraftData {
  title?: string;
  content: string;
  contentJson?: string;
  rhythm?: string;
  visibility?: 'draft' | 'private' | 'cohort' | 'public';
  responsePreference?: 'open' | 'question_only' | 'closed';
  savedAt: number; // unix timestamp (ms)
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const STORAGE_KEYS = {
  note: 'divelog-draft-note',
  article: 'divelog-draft-article',
} as const;

/**
 * Save draft to localStorage
 * @param format - 'note' or 'article'
 * @param data - Draft data without savedAt (will be added)
 */
export function saveDraftToLocal(
  format: 'note' | 'article',
  data: Omit<DraftData, 'savedAt'>
): void {
  try {
    // Ignore empty drafts
    if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
      return;
    }

    const key = STORAGE_KEYS[format];
    const draftData: DraftData = {
      ...data,
      savedAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(draftData));
  } catch (error) {
    // Silently fail if localStorage is unavailable (SSR, quota exceeded, etc.)
    // In production, you might want to log this to a monitoring service
  }
}

/**
 * Load draft from localStorage
 * @param format - 'note' or 'article'
 * @returns Draft data if valid and not expired, null otherwise
 */
export function loadDraftFromLocal(format: 'note' | 'article'): DraftData | null {
  try {
    const key = STORAGE_KEYS[format];
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const draft: DraftData = JSON.parse(stored);

    // Check TTL
    if (Date.now() - draft.savedAt > TTL_MS) {
      clearLocalDraft(format);
      return null;
    }

    // Validate content is not empty
    if (!draft.content || typeof draft.content !== 'string' || draft.content.trim() === '') {
      return null;
    }

    return draft;
  } catch (error) {
    // Silently fail if localStorage is unavailable or JSON parse fails
    return null;
  }
}

/**
 * Clear draft from localStorage
 * @param format - 'note' or 'article'
 */
export function clearLocalDraft(format: 'note' | 'article'): void {
  try {
    const key = STORAGE_KEYS[format];
    localStorage.removeItem(key);
  } catch (error) {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Check if a draft exists in localStorage
 * @param format - 'note' or 'article'
 * @returns true if draft exists and is not expired, false otherwise
 */
export function hasDraftLocal(format: 'note' | 'article'): boolean {
  return loadDraftFromLocal(format) !== null;
}
