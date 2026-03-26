import { describe, it, expect } from "vitest";
import {
  getPlainText,
  detectContentFormat,
  renderContentToHtml,
} from "../content/content.server";

describe("content.server", () => {
  describe("getPlainText", () => {
    it("should return plain text as-is for note format", () => {
      const input = "안녕하세요";
      const result = getPlainText(input, "note");
      expect(result).toBe("안녕하세요");
    });

    it("should return empty string for empty note", () => {
      const result = getPlainText("", "note");
      expect(result).toBe("");
    });

    it("should extract text from valid Tiptap JSON with single paragraph", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "안녕하세요" }],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("안녕하세요");
    });

    it("should extract text from Tiptap JSON with multiple paragraphs", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "첫 번째" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "두 번째" }],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("첫 번째\n두 번째");
    });

    it("should handle Tiptap JSON with heading and paragraph", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "제목" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "본문" }],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("제목\n본문");
    });

    it("should collapse multiple newlines to double newline", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "첫 번째" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "두 번째" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "세 번째" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "네 번째" }],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      // Each paragraph adds \n, so we get "첫 번째\n두 번째\n세 번째\n네 번째\n"
      // Then trim() removes trailing newline
      expect(result).toBe("첫 번째\n두 번째\n세 번째\n네 번째");
    });

    it("should handle invalid JSON gracefully by returning original content", () => {
      const invalidJson = "{broken json";
      const result = getPlainText(invalidJson, "article");
      expect(result).toBe("{broken json");
    });

    it("should handle JSON that is not a Tiptap document", () => {
      const notTiptapJson = JSON.stringify({ type: "other", content: [] });
      const result = getPlainText(notTiptapJson, "article");
      expect(result).toBe(notTiptapJson);
    });

    it("should handle Tiptap JSON with nested formatting marks", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "일반 텍스트 " },
              {
                type: "text",
                text: "굵은 텍스트",
                marks: [{ type: "bold" }],
              },
              { type: "text", text: " 다시 일반" },
            ],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("일반 텍스트 굵은 텍스트 다시 일반");
    });

    it("should handle Tiptap JSON with hardBreak", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "첫 줄" },
              { type: "hardBreak" },
              { type: "text", text: "두 번째 줄" },
            ],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("첫 줄\n두 번째 줄");
    });

    it("should handle Tiptap JSON with bullet list", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "항목 1" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "항목 2" }],
                  },
                ],
              },
            ],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("항목 1\n\n항목 2");
    });

    it("should handle empty Tiptap document", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("");
    });

    it("should trim leading and trailing whitespace", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "  텍스트  " }],
          },
        ],
      });
      const result = getPlainText(tiptapJson, "article");
      expect(result).toBe("텍스트");
    });
  });

  describe("detectContentFormat", () => {
    it("should detect valid Tiptap JSON as json format", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "안녕하세요" }],
          },
        ],
      });
      const result = detectContentFormat(tiptapJson);
      expect(result).toBe("json");
    });

    it("should detect plain text as plaintext format", () => {
      const plainText = "안녕하세요";
      const result = detectContentFormat(plainText);
      expect(result).toBe("plaintext");
    });

    it("should detect invalid JSON as plaintext format", () => {
      const invalidJson = "{broken json";
      const result = detectContentFormat(invalidJson);
      expect(result).toBe("plaintext");
    });

    it("should detect JSON that is not a Tiptap document as plaintext", () => {
      const notTiptapJson = JSON.stringify({ type: "other", content: [] });
      const result = detectContentFormat(notTiptapJson);
      expect(result).toBe("plaintext");
    });

    it("should detect empty Tiptap document as json", () => {
      const emptyTiptapJson = JSON.stringify({
        type: "doc",
        content: [],
      });
      const result = detectContentFormat(emptyTiptapJson);
      expect(result).toBe("json");
    });

    it("should detect JSON array as plaintext", () => {
      const jsonArray = JSON.stringify([1, 2, 3]);
      const result = detectContentFormat(jsonArray);
      expect(result).toBe("plaintext");
    });

    it("should detect JSON without type field as plaintext", () => {
      const jsonNoType = JSON.stringify({ content: [] });
      const result = detectContentFormat(jsonNoType);
      expect(result).toBe("plaintext");
    });

    it("should detect JSON with wrong type value as plaintext", () => {
      const jsonWrongType = JSON.stringify({
        type: "paragraph",
        content: [],
      });
      const result = detectContentFormat(jsonWrongType);
      expect(result).toBe("plaintext");
    });

    it("should detect empty string as plaintext", () => {
      const result = detectContentFormat("");
      expect(result).toBe("plaintext");
    });

    it("should detect multiline plain text as plaintext", () => {
      const multilineText = "첫 줄\n두 번째 줄\n세 번째 줄";
      const result = detectContentFormat(multilineText);
      expect(result).toBe("plaintext");
    });
  });

  describe("renderContentToHtml", () => {
    it("should wrap plain text in div with whitespace-pre-wrap for note format", () => {
      const plainText = "안녕하세요";
      const result = renderContentToHtml(plainText, "note");
      expect(result).toContain('class="whitespace-pre-wrap"');
      expect(result).toContain("안녕하세요");
    });

    it("should escape HTML special characters in note format", () => {
      const plainText = "<script>alert('xss')</script>";
      const result = renderContentToHtml(plainText, "note");
      expect(result).toContain("&lt;script&gt;");
      expect(result).toContain("&lt;/script&gt;");
      expect(result).not.toContain("<script>");
    });

    it("should escape ampersand in note format", () => {
      const plainText = "A & B";
      const result = renderContentToHtml(plainText, "note");
      expect(result).toContain("A &amp; B");
    });

    it("should escape quotes in note format", () => {
      const plainText = 'He said "hello"';
      const result = renderContentToHtml(plainText, "note");
      expect(result).toContain("&quot;");
    });

    it("should escape single quotes in note format", () => {
      const plainText = "It's a test";
      const result = renderContentToHtml(plainText, "note");
      expect(result).toContain("&#39;");
    });

    it("should render Tiptap JSON to HTML for article format", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "안녕하세요" }],
          },
        ],
      });
      const result = renderContentToHtml(tiptapJson, "article");
      expect(result).toContain("안녕하세요");
      expect(result).toContain("<p");
    });

    it("should render populated 목차 markup with Korean heading ids", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          { type: "toc" },
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "여정 소개" }],
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "다음 단계" }],
          },
        ],
      });

      const result = renderContentToHtml(tiptapJson, "article");

      expect(result).toContain('<nav class="table-of-contents" data-toc><p>목차</p><ol>');
      expect(result).toContain('<a href="#여정-소개">여정 소개</a>');
      expect(result).toContain('<a href="#다음-단계">다음 단계</a>');
      expect(result).toContain('<h1 id="여정-소개">여정 소개</h1>');
      expect(result).toContain('<h2 id="다음-단계">다음 단계</h2>');
    });

    it("should generate unique fallback heading ids for duplicates and empty headings", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          { type: "toc" },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "중복 제목" }],
          },
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: "중복 제목" }],
          },
          {
            type: "heading",
            attrs: { level: 4 },
            content: [{ type: "text", text: "!!!" }],
          },
        ],
      });

      const result = renderContentToHtml(tiptapJson, "article");

      expect(result).toContain('<h2 id="중복-제목">중복 제목</h2>');
      expect(result).toContain('<h3 id="중복-제목-2">중복 제목</h3>');
      expect(result).toContain('<h4 id="section">!!!</h4>');
      expect(result).toContain('<a href="#중복-제목">중복 제목</a>');
      expect(result).toContain('<a href="#중복-제목-2">중복 제목</a>');
      expect(result).toContain('<a href="#section">섹션 3</a>');
      expect(result).not.toContain('<a href="#section">!!!</a>');
    });

    it("should fallback to plain text rendering for invalid JSON in article format", () => {
      const invalidJson = "{broken json";
      const result = renderContentToHtml(invalidJson, "article");
      expect(result).toContain('class="whitespace-pre-wrap"');
      expect(result).toContain("{broken json");
    });

    it("should fallback to plain text rendering for non-Tiptap JSON in article format", () => {
      const notTiptapJson = JSON.stringify({ type: "other", content: [] });
      const result = renderContentToHtml(notTiptapJson, "article");
      expect(result).toContain('class="whitespace-pre-wrap"');
    });

    it("should handle empty note", () => {
      const result = renderContentToHtml("", "note");
      expect(result).toContain('class="whitespace-pre-wrap"');
    });

    it("should handle empty Tiptap document", () => {
      const emptyTiptapJson = JSON.stringify({
        type: "doc",
        content: [],
      });
      const result = renderContentToHtml(emptyTiptapJson, "article");
      // Should render without error
      expect(typeof result).toBe("string");
    });

    it("should preserve newlines in note format", () => {
      const plainText = "첫 줄\n두 번째 줄";
      const result = renderContentToHtml(plainText, "note");
      expect(result).toContain("첫 줄\n두 번째 줄");
    });
  });
});
