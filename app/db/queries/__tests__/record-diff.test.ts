import { describe, it, expect } from "vitest";
import {
  compareRecordStates,
  computeTagDiff,
  formatFieldChange,
  hasActualChanges,
} from "../../../lib/utils/record-diff";

describe("record-diff utilities", () => {
  describe("compareRecordStates", () => {
    it("detects title change", () => {
      const oldState = { title: "Old Title" };
      const newState = { title: "New Title" };

      const changes = compareRecordStates(oldState, newState);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "title",
        oldValue: "Old Title",
        newValue: "New Title",
      });
    });

    it("detects visibility change", () => {
      const oldState = { visibility: "cohort" };
      const newState = { visibility: "public" };

      const changes = compareRecordStates(oldState, newState);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "visibility",
        oldValue: "cohort",
        newValue: "public",
      });
    });

    it("returns empty array when no changes", () => {
      const oldState = {
        title: "Same Title",
        visibility: "cohort",
        format: "note",
      };
      const newState = {
        title: "Same Title",
        visibility: "cohort",
        format: "note",
      };

      const changes = compareRecordStates(oldState, newState);

      expect(changes).toHaveLength(0);
    });
  });

  describe("computeTagDiff", () => {
    it("detects added and removed tags by name", () => {
      const oldTags = [
        { id: "tag-1", name: "React" },
        { id: "tag-2", name: "TypeScript" },
      ];
      const newTags = [
        { id: "tag-2", name: "TypeScript" },
        { id: "tag-3", name: "Testing" },
      ];

      const diff = computeTagDiff(oldTags, newTags);

      expect(diff.added).toEqual(["Testing"]);
      expect(diff.removed).toEqual(["React"]);
    });
  });

  describe("formatFieldChange", () => {
    it("formats visibility change with Korean labels", () => {
      const result = formatFieldChange("visibility", "cohort", "public");

      expect(result).toEqual({
        label: "공개 범위",
        summary: "코호트 공개 → 전체 공개",
      });
    });

    it("formats private visibility change with Korean label", () => {
      const result = formatFieldChange("visibility", "public", "private");

      expect(result).toEqual({
        label: "공개 범위",
        summary: "전체 공개 → 나만 보기",
      });
    });

    it("formats content change with character count delta", () => {
      const oldContent = "a".repeat(100);
      const newContent = "a".repeat(220);

      const result = formatFieldChange("content", oldContent, newContent);

      expect(result.label).toBe("내용");
      expect(result.summary).toContain("+120자");
    });

    it("formats content change with negative delta", () => {
      const oldContent = "a".repeat(200);
      const newContent = "a".repeat(150);

      const result = formatFieldChange("content", oldContent, newContent);

      expect(result.label).toBe("내용");
      expect(result.summary).toContain("-50자");
    });

    it("formats format field change", () => {
      const result = formatFieldChange("format", "note", "article");

      expect(result).toEqual({
        label: "형식",
        summary: "노트 → 글",
      });
    });

    it("formats type field change", () => {
      const result = formatFieldChange("type", "exploration", "project");

      expect(result).toEqual({
        label: "유형",
        summary: "탐구 → 프로젝트",
      });
    });

    it("formats rhythm field change", () => {
      const result = formatFieldChange("rhythm", "free", "weekly");

      expect(result).toEqual({
        label: "리듬",
        summary: "자유 → 주간",
      });
    });

    it("formats responsePreference field change", () => {
      const result = formatFieldChange(
        "responsePreference",
        "open",
        "question_only",
      );

      expect(result).toEqual({
        label: "응답 선호도",
        summary: "열린 응답 → 질문만",
      });
    });

    it("handles null/undefined values", () => {
      const result = formatFieldChange("challengeId", null, "challenge-123");

      expect(result.label).toBe("챌린지");
      expect(result.summary).toContain("없음");
    });
  });

  describe("hasActualChanges", () => {
    it("returns false for identical states", () => {
      const oldState = {
        title: "Same",
        visibility: "cohort",
      };
      const newState = {
        title: "Same",
        visibility: "cohort",
      };

      const result = hasActualChanges(oldState, newState);

      expect(result).toBe(false);
    });

    it("returns true when there are changes", () => {
      const oldState = {
        title: "Old",
      };
      const newState = {
        title: "New",
      };

      const result = hasActualChanges(oldState, newState);

      expect(result).toBe(true);
    });
  });
});
