import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLocalReads,
  markLocalRead,
  unmarkLocalRead,
  clearLocalReads,
  isLocalRead,
  getLocalReadIds,
  popLocalReadsForSync,
  hasSyncedThisSession,
  markSyncedThisSession,
} from '../infra/read-storage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('read-storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('markLocalRead + isLocalRead', () => {
    it('should mark a record as read', () => {
      expect(isLocalRead('record-1')).toBe(false);

      markLocalRead('record-1');

      expect(isLocalRead('record-1')).toBe(true);
    });

    it('should mark multiple records as read', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');
      markLocalRead('record-3');

      expect(isLocalRead('record-1')).toBe(true);
      expect(isLocalRead('record-2')).toBe(true);
      expect(isLocalRead('record-3')).toBe(true);
    });

    it('should store unix timestamp in seconds', () => {
      const beforeMark = Math.floor(Date.now() / 1000);
      markLocalRead('record-1');
      const afterMark = Math.floor(Date.now() / 1000);

      const reads = getLocalReads();
      const timestamp = reads['record-1'];

      expect(timestamp).toBeGreaterThanOrEqual(beforeMark);
      expect(timestamp).toBeLessThanOrEqual(afterMark);
    });
  });

  describe('unmarkLocalRead', () => {
    it('should unmark a read record', () => {
      markLocalRead('record-1');
      expect(isLocalRead('record-1')).toBe(true);

      unmarkLocalRead('record-1');

      expect(isLocalRead('record-1')).toBe(false);
    });

    it('should not affect other records', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');

      unmarkLocalRead('record-1');

      expect(isLocalRead('record-1')).toBe(false);
      expect(isLocalRead('record-2')).toBe(true);
    });
  });

  describe('clearLocalReads', () => {
    it('should clear all read records', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');
      markLocalRead('record-3');

      clearLocalReads();

      expect(isLocalRead('record-1')).toBe(false);
      expect(isLocalRead('record-2')).toBe(false);
      expect(isLocalRead('record-3')).toBe(false);
      expect(getLocalReadIds().size).toBe(0);
    });
  });

  describe('getLocalReadIds', () => {
    it('should return empty set when no reads', () => {
      const ids = getLocalReadIds();
      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBe(0);
    });

    it('should return all read record IDs', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');
      markLocalRead('record-3');

      const ids = getLocalReadIds();

      expect(ids.size).toBe(3);
      expect(ids.has('record-1')).toBe(true);
      expect(ids.has('record-2')).toBe(true);
      expect(ids.has('record-3')).toBe(true);
    });
  });

  describe('TTL expiration (90 days)', () => {
    it('should filter out expired entries when loading', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');

      const stored = localStorageMock.getItem('divelog-reads');
      const parsed = JSON.parse(stored!);

      const ninetyOneDaysAgo = Math.floor(Date.now() / 1000) - 91 * 24 * 60 * 60;
      parsed['record-1'] = ninetyOneDaysAgo;

      localStorageMock.setItem('divelog-reads', JSON.stringify(parsed));

      const reads = getLocalReads();

      expect(reads['record-1']).toBeUndefined();
      expect(reads['record-2']).toBeDefined();
    });

    it('should keep entries within TTL', () => {
      markLocalRead('record-1');

      const stored = localStorageMock.getItem('divelog-reads');
      const parsed = JSON.parse(stored!);

      const eightyNineDaysAgo = Math.floor(Date.now() / 1000) - 89 * 24 * 60 * 60;
      parsed['record-1'] = eightyNineDaysAgo;

      localStorageMock.setItem('divelog-reads', JSON.stringify(parsed));

      const reads = getLocalReads();

      expect(reads['record-1']).toBeDefined();
      expect(isLocalRead('record-1')).toBe(true);
    });

    it('should auto-clean expired entries from storage', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');

      const stored = localStorageMock.getItem('divelog-reads');
      const parsed = JSON.parse(stored!);

      const ninetyOneDaysAgo = Math.floor(Date.now() / 1000) - 91 * 24 * 60 * 60;
      parsed['record-1'] = ninetyOneDaysAgo;

      localStorageMock.setItem('divelog-reads', JSON.stringify(parsed));

      getLocalReads();

      const updatedStored = localStorageMock.getItem('divelog-reads');
      const updatedParsed = JSON.parse(updatedStored!);

      expect(updatedParsed['record-1']).toBeUndefined();
      expect(updatedParsed['record-2']).toBeDefined();
    });
  });

  describe('size cap (500 entries)', () => {
    it('should enforce max 500 entries', () => {
      for (let i = 0; i < 510; i++) {
        markLocalRead(`record-${i}`);
      }

      const reads = getLocalReads();
      expect(Object.keys(reads).length).toBeLessThanOrEqual(500);
    });

    it('should remove oldest entries when exceeding limit', () => {
      for (let i = 0; i < 505; i++) {
        markLocalRead(`record-${i}`);
      }

      const reads = getLocalReads();

      expect(Object.keys(reads).length).toBeLessThanOrEqual(500);
      expect(reads['record-0']).toBeUndefined();
      expect(reads['record-504']).toBeDefined();
    });

    it('should maintain newest entry when at capacity', () => {
      for (let i = 0; i < 500; i++) {
        markLocalRead(`record-${i}`);
      }

      markLocalRead('record-newest');

      const reads = getLocalReads();

      expect(Object.keys(reads).length).toBeLessThanOrEqual(500);
      expect(reads['record-newest']).toBeDefined();
    });
  });

  describe('popLocalReadsForSync', () => {
    it('should return empty array when no reads', () => {
      const result = popLocalReadsForSync();

      expect(result).toEqual([]);
    });

    it('should return all reads with recordId and readAt', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');

      const result = popLocalReadsForSync();

      expect(result.length).toBe(2);
      expect(result.some((r) => r.recordId === 'record-1')).toBe(true);
      expect(result.some((r) => r.recordId === 'record-2')).toBe(true);
      expect(result[0]).toHaveProperty('readAt');
      expect(typeof result[0].readAt).toBe('number');
    });

    it('should clear localStorage after popping', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');

      popLocalReadsForSync();

      expect(getLocalReadIds().size).toBe(0);
      expect(localStorageMock.getItem('divelog-reads')).toBeNull();
    });

    it('should preserve readAt timestamps', () => {
      markLocalRead('record-1');

      const stored = localStorageMock.getItem('divelog-reads');
      const parsed = JSON.parse(stored!);
      const originalTimestamp = parsed['record-1'];

      const result = popLocalReadsForSync();

      expect(result[0].readAt).toBe(originalTimestamp);
    });
  });

  describe('session sync flag', () => {
    it('should return false when no sync flag set', () => {
      expect(hasSyncedThisSession()).toBe(false);
    });

    it('should return true after marking synced', () => {
      markSyncedThisSession();

      expect(hasSyncedThisSession()).toBe(true);
    });

    it('should persist sync flag in sessionStorage', () => {
      markSyncedThisSession();

      const flag = sessionStorageMock.getItem('divelog-reads-synced');
      expect(flag).toBe('true');
    });
  });

  describe('localStorage error handling', () => {
    it('should handle getItem throwing', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('Storage error');
        },
        setItem: () => {},
        removeItem: () => {},
      });

      const reads = getLocalReads();
      expect(reads).toEqual({});
    });

    it('should handle setItem throwing on mark', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage error');
        },
        removeItem: () => {},
      });

      expect(() => {
        markLocalRead('record-1');
      }).not.toThrow();
    });

    it('should handle setItem throwing on unmark', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage error');
        },
        removeItem: () => {},
      });

      expect(() => {
        unmarkLocalRead('record-1');
      }).not.toThrow();
    });

    it('should handle removeItem throwing', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {
          throw new Error('Storage error');
        },
      });

      expect(() => {
        clearLocalReads();
      }).not.toThrow();
    });

    it('should handle JSON.parse throwing', () => {
      localStorageMock.setItem('divelog-reads', 'invalid json {');

      const reads = getLocalReads();
      expect(reads).toEqual({});
    });

    it('should handle quota exceeded on mark', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      });

      expect(() => {
        markLocalRead('record-1');
      }).not.toThrow();
    });
  });

  describe('getLocalReads', () => {
    it('should return empty object when no data', () => {
      const reads = getLocalReads();
      expect(reads).toEqual({});
    });

    it('should return all non-expired reads', () => {
      markLocalRead('record-1');
      markLocalRead('record-2');

      const reads = getLocalReads();

      expect(Object.keys(reads).length).toBe(2);
      expect(reads['record-1']).toBeDefined();
      expect(reads['record-2']).toBeDefined();
    });
  });

  describe('integration: mark, check, pop, sync', () => {
    it('should complete full read tracking flow', () => {
      expect(hasSyncedThisSession()).toBe(false);

      markLocalRead('record-1');
      markLocalRead('record-2');

      expect(isLocalRead('record-1')).toBe(true);
      expect(isLocalRead('record-2')).toBe(true);
      expect(getLocalReadIds().size).toBe(2);

      const toSync = popLocalReadsForSync();

      expect(toSync.length).toBe(2);
      expect(getLocalReadIds().size).toBe(0);

      markSyncedThisSession();

      expect(hasSyncedThisSession()).toBe(true);
    });
  });
});
