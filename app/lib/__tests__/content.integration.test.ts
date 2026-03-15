import { describe, expect, it } from "vitest";

import {
  detectContentFormat,
  getPlainText,
  renderContentToHtml,
} from "../content.server";
import { extractImageKeys } from "../r2-cleanup.server";

describe("콘텐츠 유틸리티 통합", () => {
  it("Article JSON에서 이미지 키 추출 후 plain text와 HTML도 정상", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] },
        { type: "image", attrs: { src: "/api/images/records/test.jpg" } },
      ],
    });

    const format = detectContentFormat(json);
    expect(format).toBe("json");

    const text = getPlainText(json, "article");
    expect(text).toContain("안녕하세요");

    const html = renderContentToHtml(json, "article");
    expect(html).toContain('/api/images/records/test.jpg');

    const imageKeys = extractImageKeys(json);
    expect(imageKeys).toEqual(["records/test.jpg"]);
  });

  it("plain text 기록은 이미지 키 없음", () => {
    const content = "평범한 텍스트 내용입니다";
    const format = detectContentFormat(content);
    expect(format).toBe("plaintext");

    const text = getPlainText(content, "note");
    expect(text).toBe(content);

    const html = renderContentToHtml(content, "note");
    expect(html).toContain("평범한 텍스트 내용입니다");

    const keys = extractImageKeys(content);
    expect(keys).toEqual([]);
  });
});
