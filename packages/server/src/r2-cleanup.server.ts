import { createModuleLogger } from "./logger.server";

const logger = createModuleLogger("r2-cleanup.server");

interface TiptapJsonNode {
  type?: string;
  attrs?: { src?: string; [key: string]: unknown };
  content?: TiptapJsonNode[];
}

export function extractImageKeys(tiptapJsonString: string): string[] {
  const keys: string[] = [];

  try {
    const doc = JSON.parse(tiptapJsonString) as TiptapJsonNode;

    function traverse(node: TiptapJsonNode): void {
      if (!node) return;

      if (node.type === "image" && node.attrs?.src) {
        const src = node.attrs.src;
        if (src.startsWith("/api/images/")) {
          const key = src.replace("/api/images/", "");
          keys.push(key);
        }
      }

      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    }

    traverse(doc);
  } catch (err) {
    logger.warn("r2_cleanup_parse_error", { error: err instanceof Error ? err.message : String(err) });
    return [];
  }

  return keys;
}

export async function cleanupRemovedImages(
  r2: R2Bucket,
  oldJson: string,
  newJson: string,
): Promise<void> {
  const oldKeys = extractImageKeys(oldJson);
  const newKeys = new Set(extractImageKeys(newJson));

  const toDelete = oldKeys.filter((key) => !newKeys.has(key));

  await Promise.all(toDelete.map((key) => r2.delete(key)));
}
