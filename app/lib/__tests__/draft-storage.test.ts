import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveDraftToLocal,
  loadDraftFromLocal,
  clearLocalDraft,
  hasDraftLocal,
  type DraftData,
} from "../infra/draft-storage";

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

describe("draft-storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("saveDraftToLocal + loadDraftFromLocal", () => {
    it("should save and load draft with all fields", () => {
      const draftInput = {
        title: "Test Note",
        content: "This is test content",
        contentJson: '{"type":"doc"}',
        stageId: "stage-123",
        rhythm: "daily",
        visibility: "cohort" as const,
        responsePreference: "open" as const,
      };

      saveDraftToLocal("note", draftInput);
      const loaded = loadDraftFromLocal("note");

      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe("Test Note");
      expect(loaded?.content).toBe("This is test content");
      expect(loaded?.contentJson).toBe('{"type":"doc"}');
      expect(loaded?.stageId).toBe("stage-123");
      expect(loaded?.rhythm).toBe("daily");
      expect(loaded?.visibility).toBe("cohort");
      expect(loaded?.responsePreference).toBe("open");
      expect(loaded?.savedAt).toBeDefined();
      expect(typeof loaded?.savedAt).toBe("number");
    });

    it("should save and load article draft", () => {
      const draftInput = {
        title: "Article Title",
        content: "Article content here",
        visibility: "public" as const,
      };

      saveDraftToLocal("article", draftInput);
      const loaded = loadDraftFromLocal("article");

      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe("Article Title");
      expect(loaded?.content).toBe("Article content here");
      expect(loaded?.visibility).toBe("public");
    });

    it("should handle minimal draft with only content", () => {
      const draftInput = {
        content: "Just content",
      };

      saveDraftToLocal("note", draftInput);
      const loaded = loadDraftFromLocal("note");

      expect(loaded).not.toBeNull();
      expect(loaded?.content).toBe("Just content");
      expect(loaded?.title).toBeUndefined();
    });
  });

  describe("clearLocalDraft", () => {
    it("should clear saved draft", () => {
      const draftInput = {
        content: "Test content",
      };

      saveDraftToLocal("note", draftInput);
      expect(hasDraftLocal("note")).toBe(true);

      clearLocalDraft("note");
      expect(hasDraftLocal("note")).toBe(false);
    });

    it("should not affect other format drafts", () => {
      saveDraftToLocal("note", { content: "Note content" });
      saveDraftToLocal("article", { content: "Article content" });

      clearLocalDraft("note");

      expect(hasDraftLocal("note")).toBe(false);
      expect(hasDraftLocal("article")).toBe(true);
    });
  });

  describe("hasDraftLocal", () => {
    it("should return false when no draft exists", () => {
      expect(hasDraftLocal("note")).toBe(false);
      expect(hasDraftLocal("article")).toBe(false);
    });

    it("should return true after saving draft", () => {
      saveDraftToLocal("note", { content: "Test" });
      expect(hasDraftLocal("note")).toBe(true);
    });

    it("should return false after clearing draft", () => {
      saveDraftToLocal("note", { content: "Test" });
      clearLocalDraft("note");
      expect(hasDraftLocal("note")).toBe(false);
    });
  });

  describe("TTL expiration", () => {
    it("should return null for expired draft", () => {
      const draftInput = {
        content: "Expired content",
      };

      saveDraftToLocal("note", draftInput);

      const stored = localStorageMock.getItem("divelog-draft-note");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      parsed.savedAt = thirtyOneDaysAgo;

      localStorageMock.setItem("divelog-draft-note", JSON.stringify(parsed));

      const loaded = loadDraftFromLocal("note");
      expect(loaded).toBeNull();
    });

    it("should return draft within TTL", () => {
      const draftInput = {
        content: "Fresh content",
      };

      saveDraftToLocal("note", draftInput);

      const stored = localStorageMock.getItem("divelog-draft-note");
      const parsed = JSON.parse(stored!);
      const twentyNineDaysAgo = Date.now() - 29 * 24 * 60 * 60 * 1000;
      parsed.savedAt = twentyNineDaysAgo;

      localStorageMock.setItem("divelog-draft-note", JSON.stringify(parsed));

      const loaded = loadDraftFromLocal("note");
      expect(loaded).not.toBeNull();
      expect(loaded?.content).toBe("Fresh content");
    });

    it("should clear expired draft when loading", () => {
      saveDraftToLocal("note", { content: "Expired" });

      const stored = localStorageMock.getItem("divelog-draft-note");
      const parsed = JSON.parse(stored!);
      parsed.savedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      localStorageMock.setItem("divelog-draft-note", JSON.stringify(parsed));

      loadDraftFromLocal("note");

      expect(localStorageMock.getItem("divelog-draft-note")).toBeNull();
    });
  });

  describe("empty content handling", () => {
    it("should not save empty content", () => {
      saveDraftToLocal("note", { content: "" });
      expect(hasDraftLocal("note")).toBe(false);
    });

    it("should not save whitespace-only content", () => {
      saveDraftToLocal("note", { content: "   \n\t  " });
      expect(hasDraftLocal("note")).toBe(false);
    });

    it("should return null for empty stored content", () => {
      const stored = JSON.stringify({
        content: "",
        savedAt: Date.now(),
      });
      localStorageMock.setItem("divelog-draft-note", stored);

      const loaded = loadDraftFromLocal("note");
      expect(loaded).toBeNull();
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage.getItem throwing", () => {
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new Error("Storage error");
        },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      });

      const loaded = loadDraftFromLocal("note");
      expect(loaded).toBeNull();
    });

    it("should handle localStorage.setItem throwing", () => {
      vi.stubGlobal("localStorage", {
        getItem: () => null,
        setItem: () => {
          throw new Error("Storage error");
        },
        removeItem: () => {},
        clear: () => {},
      });

      expect(() => {
        saveDraftToLocal("note", { content: "Test" });
      }).not.toThrow();
    });

    it("should handle JSON.parse throwing", () => {
      localStorageMock.setItem("divelog-draft-note", "invalid json {");

      const loaded = loadDraftFromLocal("note");
      expect(loaded).toBeNull();
    });
  });

  describe("separate storage for formats", () => {
    it("should maintain separate storage for note and article", () => {
      saveDraftToLocal("note", { content: "Note content" });
      saveDraftToLocal("article", { content: "Article content" });

      const noteLoaded = loadDraftFromLocal("note");
      const articleLoaded = loadDraftFromLocal("article");

      expect(noteLoaded?.content).toBe("Note content");
      expect(articleLoaded?.content).toBe("Article content");
    });

    it("should overwrite previous draft of same format", () => {
      saveDraftToLocal("note", { content: "First draft" });
      saveDraftToLocal("note", { content: "Second draft" });

      const loaded = loadDraftFromLocal("note");
      expect(loaded?.content).toBe("Second draft");
    });
  });
});
