/**
 * R2 이미지 orphan 정리 유틸리티
 * 기록 수정 시 제거된 이미지를 R2에서 삭제
 */

import { createModuleLogger } from "./logger.server";

const logger = createModuleLogger("r2-cleanup.server");

/**
 * Tiptap JSON에서 이미지 R2 키 추출
 * @param tiptapJsonString - Tiptap JSON 문자열
 * @returns R2 키 배열 (예: ["records/abc123.jpg"])
 */
export function extractImageKeys(tiptapJsonString: string): string[] {
  const keys: string[] = [];

  try {
    const doc = JSON.parse(tiptapJsonString);

    // 재귀 함수로 모든 노드 순회
    function traverse(node: any): void {
      if (!node) return;

      // type === "image"인 노드에서 src 추출
      if (node.type === "image" && node.attrs?.src) {
        const src = node.attrs.src;
        // src: "/api/images/records/abc123.jpg" → key: "records/abc123.jpg"
        if (src.startsWith("/api/images/")) {
          const key = src.replace("/api/images/", "");
          keys.push(key);
        }
      }

      // 자식 노드 순회
      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    }

    traverse(doc);
  } catch (err) {
    // JSON 파싱 실패 시 빈 배열 반환
    logger.warn("r2_cleanup_parse_error", { error: err instanceof Error ? err.message : String(err) });
    return [];
  }

  return keys;
}

/**
 * 기록 수정 시 제거된 이미지 R2 삭제
 * @param r2 - R2Bucket 인스턴스
 * @param oldJson - 수정 전 Tiptap JSON
 * @param newJson - 수정 후 Tiptap JSON
 */
export async function cleanupRemovedImages(
  r2: R2Bucket,
  oldJson: string,
  newJson: string
): Promise<void> {
  const oldKeys = extractImageKeys(oldJson);
  const newKeys = new Set(extractImageKeys(newJson));

  // old에는 있고 new에는 없는 키만 삭제
  const toDelete = oldKeys.filter((key) => !newKeys.has(key));

  // 병렬로 삭제
  await Promise.all(toDelete.map((key) => r2.delete(key)));
}
