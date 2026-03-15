import { describe, expect, it } from "vitest";

import { cleanupRemovedImages, extractImageKeys } from "../r2-cleanup.server";

describe("extractImageKeys", () => {
  it("빈 JSON에서 빈 배열 반환", () => {
    const json = JSON.stringify({ type: "doc", content: [] });

    expect(extractImageKeys(json)).toEqual([]);
  });

  it("이미지 없는 JSON에서 빈 배열 반환", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
    });

    expect(extractImageKeys(json)).toEqual([]);
  });

  it("이미지 src에서 R2 키 추출", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "/api/images/records/abc123.jpg" },
        },
      ],
    });

    expect(extractImageKeys(json)).toEqual(["records/abc123.jpg"]);
  });

  it("중첩된 이미지도 추출", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "image",
                  attrs: { src: "/api/images/records/abc.png" },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(extractImageKeys(json)).toEqual(["records/abc.png"]);
  });

  it("잘못된 JSON에서 빈 배열 반환", () => {
    expect(extractImageKeys("{invalid json")).toEqual([]);
  });

  it("여러 이미지 추출", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "/api/images/records/a.jpg" } },
        { type: "image", attrs: { src: "/api/images/records/b.png" } },
      ],
    });

    const keys = extractImageKeys(json);

    expect(keys).toContain("records/a.jpg");
    expect(keys).toContain("records/b.png");
    expect(keys).toHaveLength(2);
  });
});

describe("cleanupRemovedImages", () => {
  it("제거된 이미지 키만 삭제", async () => {
    const deletedKeys: string[] = [];
    const mockR2 = {
      delete: async (key: string) => {
        deletedKeys.push(key);
      },
    } as unknown as R2Bucket;

    const oldJson = JSON.stringify({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "/api/images/records/a.jpg" } },
        { type: "image", attrs: { src: "/api/images/records/b.png" } },
      ],
    });
    const newJson = JSON.stringify({
      type: "doc",
      content: [{ type: "image", attrs: { src: "/api/images/records/a.jpg" } }],
    });

    await cleanupRemovedImages(mockR2, oldJson, newJson);

    expect(deletedKeys).toEqual(["records/b.png"]);
  });

  it("이미지 추가만 된 경우 삭제 없음", async () => {
    const deletedKeys: string[] = [];
    const mockR2 = {
      delete: async (key: string) => {
        deletedKeys.push(key);
      },
    } as unknown as R2Bucket;

    await cleanupRemovedImages(
      mockR2,
      JSON.stringify({ type: "doc", content: [] }),
      JSON.stringify({
        type: "doc",
        content: [{ type: "image", attrs: { src: "/api/images/records/a.jpg" } }],
      })
    );

    expect(deletedKeys).toEqual([]);
  });
});
