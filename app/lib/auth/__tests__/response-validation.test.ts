import { describe, it, expect } from "vitest";
import { validateResponseContentLength, validateMentionLimits } from "../validation";

const shortTiptapJson = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "짧은 응답입니다" }] }],
});

const makeJsonWithMentions = (count: number) =>
  JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: Array.from({ length: count }, (_, i) => ({
          type: "userMention",
          attrs: { id: `usr_${i}`, label: `사용자${i}`, slug: `user-${i}` },
        })),
      },
    ],
  });

describe("validateResponseContentLength", () => {
  it("returns true for short Tiptap JSON", () => {
    expect(validateResponseContentLength(shortTiptapJson)).toBe(true);
  });

  it("returns true for plain text under 10000 chars", () => {
    expect(validateResponseContentLength("Hello world")).toBe(true);
  });

  it("returns false for plain text over 10000 chars", () => {
    expect(validateResponseContentLength("a".repeat(10001))).toBe(false);
  });
});

describe("validateMentionLimits", () => {
  it("returns valid=true for 5 mentions", () => {
    const result = validateMentionLimits(makeJsonWithMentions(5));
    expect(result.valid).toBe(true);
    expect(result.userMentions).toBe(5);
  });

  it("returns valid=false for 15 mentions", () => {
    const result = validateMentionLimits(makeJsonWithMentions(15));
    expect(result.valid).toBe(false);
    expect(result.userMentions).toBe(15);
  });

  it("returns valid=true for plain text (no mentions)", () => {
    const result = validateMentionLimits("Hello world");
    expect(result.valid).toBe(true);
    expect(result.userMentions).toBe(0);
  });
});
