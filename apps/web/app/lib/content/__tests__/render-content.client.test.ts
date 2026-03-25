import { describe, expect, it } from "vitest";

import { renderArticlePreviewHtml } from "../render-content.client";

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
});
