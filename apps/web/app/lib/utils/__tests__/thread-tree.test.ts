import { describe, expect, it } from "vitest";
import { buildResponseTree, type ThreadedResponse } from "../thread-tree";

interface TestResponse {
  id: string;
  parentResponseId: string | null;
  content: string;
}

describe("buildResponseTree", () => {
  it("returns empty array for empty input", () => {
    const result = buildResponseTree<TestResponse>([]);
    expect(result).toEqual([]);
  });

  it("treats all responses as roots when parentResponseId is null", () => {
    const flat: TestResponse[] = [
      { id: "1", parentResponseId: null, content: "First" },
      { id: "2", parentResponseId: null, content: "Second" },
      { id: "3", parentResponseId: null, content: "Third" },
    ];

    const result = buildResponseTree(flat);

    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("1");
    expect(result[1]?.id).toBe("2");
    expect(result[2]?.id).toBe("3");
    expect(result.every((r) => r.depth === 0)).toBe(true);
    expect(result.every((r) => r.children.length === 0)).toBe(true);
  });

  it("builds single-level nesting with correct depth", () => {
    const flat: TestResponse[] = [
      { id: "1", parentResponseId: null, content: "Parent" },
      { id: "2", parentResponseId: "1", content: "Child 1" },
      { id: "3", parentResponseId: "1", content: "Child 2" },
    ];

    const result = buildResponseTree(flat);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
    expect(result[0]?.depth).toBe(0);
    expect(result[0]?.children).toHaveLength(2);
    expect(result[0]?.children[0]?.id).toBe("2");
    expect(result[0]?.children[0]?.depth).toBe(1);
    expect(result[0]?.children[1]?.id).toBe("3");
    expect(result[0]?.children[1]?.depth).toBe(1);
  });

  it("builds deep nesting with correct depth values", () => {
    const flat: TestResponse[] = [
      { id: "1", parentResponseId: null, content: "Root" },
      { id: "2", parentResponseId: "1", content: "Level 1" },
      { id: "3", parentResponseId: "2", content: "Level 2" },
      { id: "4", parentResponseId: "3", content: "Level 3" },
    ];

    const result = buildResponseTree(flat);

    expect(result).toHaveLength(1);
    expect(result[0]?.depth).toBe(0);
    expect(result[0]?.children[0]?.depth).toBe(1);
    expect(result[0]?.children[0]?.children[0]?.depth).toBe(2);
    expect(result[0]?.children[0]?.children[0]?.children[0]?.depth).toBe(3);
  });

  it("treats orphaned responses as roots", () => {
    const flat: TestResponse[] = [
      { id: "1", parentResponseId: null, content: "Root" },
      { id: "2", parentResponseId: "1", content: "Child" },
      { id: "3", parentResponseId: "nonexistent", content: "Orphan" },
    ];

    const result = buildResponseTree(flat);

    expect(result).toHaveLength(2);
    const orphan = result.find((r) => r.id === "3");
    expect(orphan).toBeDefined();
    expect(orphan?.depth).toBe(0);
    expect(orphan?.children).toHaveLength(0);
  });

  it("preserves all original properties in threaded responses", () => {
    const flat: TestResponse[] = [
      { id: "1", parentResponseId: null, content: "Test content" },
    ];

    const result = buildResponseTree(flat);

    expect(result[0]?.id).toBe("1");
    expect(result[0]?.parentResponseId).toBe(null);
    expect(result[0]?.content).toBe("Test content");
  });

  it("handles complex tree with multiple branches", () => {
    const flat: TestResponse[] = [
      { id: "1", parentResponseId: null, content: "Root" },
      { id: "2", parentResponseId: "1", content: "Branch A" },
      { id: "3", parentResponseId: "1", content: "Branch B" },
      { id: "4", parentResponseId: "2", content: "Leaf A1" },
      { id: "5", parentResponseId: "2", content: "Leaf A2" },
      { id: "6", parentResponseId: "3", content: "Leaf B1" },
    ];

    const result = buildResponseTree(flat);

    expect(result).toHaveLength(1);
    expect(result[0]?.children).toHaveLength(2);
    expect(result[0]?.children[0]?.children).toHaveLength(2);
    expect(result[0]?.children[1]?.children).toHaveLength(1);
  });
});
