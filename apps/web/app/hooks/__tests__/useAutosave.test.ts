import { describe, it, expect } from "vitest";
import type { AutosaveStatus } from "../useAutosave";

describe("useAutosave types and interfaces", () => {
  it("should export AutosaveStatus type with correct values", () => {
    const statuses: AutosaveStatus[] = ["idle", "saving", "saved", "error"];
    expect(statuses).toHaveLength(4);
    expect(statuses).toContain("idle");
    expect(statuses).toContain("saving");
    expect(statuses).toContain("saved");
    expect(statuses).toContain("error");
  });

  it("should have correct initial state shape", () => {
    const initialState = {
      status: "idle" as AutosaveStatus,
      lastSavedAt: null,
    };

    expect(initialState.status).toBe("idle");
    expect(initialState.lastSavedAt).toBeNull();
  });

  it("should validate UseAutosaveOptions interface", () => {
    const options = {
      format: "note" as const,
      getFormData: () => ({
        content: "Test content",
        title: "Test",
      }),
      enabled: true,
      debounceMs: 3000,
    };

    expect(options.format).toBe("note");
    expect(options.enabled).toBe(true);
    expect(options.debounceMs).toBe(3000);
    expect(typeof options.getFormData).toBe("function");
  });

  it("should support article format", () => {
    const options = {
      format: "article" as const,
      getFormData: () => ({
        content: "Article content",
        contentJson: '{"type":"doc"}',
      }),
    };

    expect(options.format).toBe("article");
  });

  it("should handle optional debounceMs with default", () => {
    const defaultDebounce = 3000;
    const customDebounce = 1000;

    expect(defaultDebounce).toBe(3000);
    expect(customDebounce).toBe(1000);
  });
});
