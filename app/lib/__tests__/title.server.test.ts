import { describe, it, expect } from "vitest";
import { generateNoteTitle } from "../utils/title.server";
import {
  createArticleSchema,
  createNoteSchema,
  updateRecordMetadataSchema,
} from "../auth/validation";

describe("generateNoteTitle", () => {
  it("returns content as-is when under 30 chars", () => {
    expect(generateNoteTitle("오늘 배운 것")).toBe("오늘 배운 것");
  });

  it("truncates with ellipsis when over 30 chars", () => {
    const long = "이것은 30자를 넘는 아주 긴 노트의 첫 문장입니다 계속";
    const result = generateNoteTitle(long);
    expect(result).toHaveLength(31);
    expect(result.endsWith("…")).toBe(true);
  });

  it("strips bold markdown", () => {
    expect(generateNoteTitle("**굵은 텍스트** 내용")).toBe("굵은 텍스트 내용");
  });

  it("strips italic markdown", () => {
    expect(generateNoteTitle("*기울임* 내용")).toBe("기울임 내용");
  });

  it("strips heading markdown", () => {
    expect(generateNoteTitle("# 제목\n본문")).toBe("제목 본문");
  });

  it("strips blockquote markdown", () => {
    expect(generateNoteTitle("> 인용문")).toBe("인용문");
  });

  it("strips inline code markdown", () => {
    expect(generateNoteTitle("`코드` 내용")).toBe("코드 내용");
  });

  it("returns 메모 for empty string", () => {
    expect(generateNoteTitle("")).toBe("메모");
  });

  it("returns 메모 for whitespace-only string", () => {
    expect(generateNoteTitle("   ")).toBe("메모");
  });

  it("preserves emojis", () => {
    expect(generateNoteTitle("🤔🤔🤔")).toBe("🤔🤔🤔");
  });

  it("collapses multiple newlines into single space", () => {
    expect(generateNoteTitle("첫째 줄\n\n둘째 줄")).toBe("첫째 줄 둘째 줄");
  });

  it("returns exactly 30 chars + ellipsis when content is exactly 31 chars", () => {
    const input = "가".repeat(31);
    const result = generateNoteTitle(input);
    expect(result).toBe("가".repeat(30) + "…");
  });
});

describe("createNoteSchema", () => {
  it("passes with content only", () => {
    const result = createNoteSchema.safeParse({ content: "테스트 내용" });
    expect(result.success).toBe(true);
  });

  it("fails with empty content", () => {
    const result = createNoteSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("does not require title", () => {
    const result = createNoteSchema.safeParse({ content: "내용만 있어요" });
    expect(result.success).toBe(true);
  });
});

describe("createArticleSchema", () => {
  it("passes with title and valid JSON content", () => {
    const result = createArticleSchema.safeParse({
      title: "아티클 제목",
      content: JSON.stringify({ type: "doc", content: [] }),
    });
    expect(result.success).toBe(true);
  });

  it("sets 기본 제목 when title is missing", () => {
    const result = createArticleSchema.safeParse({
      content: JSON.stringify({ type: "doc", content: [] }),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("(무제)");
    }
  });

  it("sets 기본 제목 when title is empty", () => {
    const result = createArticleSchema.safeParse({
      title: "",
      content: JSON.stringify({ type: "doc", content: [] }),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("(무제)");
    }
  });

  it("fails with invalid JSON content", () => {
    const result = createArticleSchema.safeParse({
      title: "제목",
      content: "일반 텍스트",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRecordMetadataSchema", () => {
  it("passes with no fields (all optional)", () => {
    const result = updateRecordMetadataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passes with question only", () => {
    const result = updateRecordMetadataSchema.safeParse({ question: "이 경험에서 뭘 배웠나요?" });
    expect(result.success).toBe(true);
  });
});
