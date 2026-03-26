import { describe, expect, it } from "vitest";

import { renderArticlePreviewHtml, renderStoredArticleHtml } from "../render-content.client";

describe("renderArticlePreviewHtml", () => {
  it("renders table nodes into table HTML", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "text", text: "단계" }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "text", text: "핵심 질문" }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "text", text: "Engage" }],
                },
                {
                  type: "tableCell",
                  content: [{ type: "text", text: "우리가 다룰 문제는 무엇인가?" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = renderArticlePreviewHtml(content);

    expect(result).toContain("<table");
    expect(result).toContain(">단계</th>");
    expect(result).toContain(">Engage</td>");
    expect(result).toContain("우리가 다룰 문제는 무엇인가?");
  });

  it("falls back to escaped plain text when content is not valid JSON", () => {
    const result = renderArticlePreviewHtml("<script>alert('xss')</script>");

    expect(result).toContain('class="whitespace-pre-wrap"');
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("preserves korean text in stored article rendering", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        { type: "toc" },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "리서치가 바꾼 것들" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "바뀌기 전" },
            { type: "text", text: ": 여행지 DB + 지도 + 리뷰 (= 정보 제공 앱)" },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "공통 키워드를 묶으니 " },
            { type: "text", marks: [{ type: "bold" }], text: '"교통과 접근성"' },
            { type: "text", text: "이 남았다." },
          ],
        },
      ],
    });

    const result = renderStoredArticleHtml(content);

    expect(result).toContain("공통 키워드를 묶으니");
    expect(result).toContain("바뀌기 전");
    expect(result).toContain('<nav class="table-of-contents" data-toc>');
    expect(result).not.toContain("�");
  });
});
