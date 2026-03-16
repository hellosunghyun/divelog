import { createModuleLogger } from "./logger.server";

const logger = createModuleLogger("extract-references.server");

type TiptapNode = {
  type?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
};

export interface ExtractedMention {
  userId: string;
  slug: string;
  displayName: string;
}

export interface ExtractedRecordRef {
  recordId: string;
  recordSlug: string;
  recordTitle: string;
}

function walkNodes(jsonStr: string, visitor: (node: TiptapNode) => void): void {
  try {
    const doc = JSON.parse(jsonStr) as TiptapNode;
    function traverse(node: TiptapNode) {
      visitor(node);
      if (node.content) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    }
    traverse(doc);
  } catch (err) {
    logger.warn("reference_extract_error", { error: err instanceof Error ? err.message : String(err) });
    return;
  }
}

export function extractUserMentions(jsonStr: string): ExtractedMention[] {
  const seen = new Set<string>();
  const results: ExtractedMention[] = [];

  walkNodes(jsonStr, (node) => {
    if ((node.type === "userMention" || node.type === "mention") && node.attrs?.id) {
      const idOrSlug = String(node.attrs.id);
      if (!seen.has(idOrSlug)) {
        seen.add(idOrSlug);
        results.push({
          userId: idOrSlug,
          slug: idOrSlug,
          displayName: String(node.attrs.label ?? ""),
        });
      }
    }
  });

  return results;
}

export function extractRecordRefs(jsonStr: string): ExtractedRecordRef[] {
  const seen = new Set<string>();
  const results: ExtractedRecordRef[] = [];

  walkNodes(jsonStr, (node) => {
    if (node.type === "recordRef" && node.attrs?.id) {
      const recordId = String(node.attrs.id);
      if (!seen.has(recordId)) {
        seen.add(recordId);
        results.push({
          recordId,
          recordSlug: String(node.attrs.slug ?? ""),
          recordTitle: String(node.attrs.label ?? ""),
        });
      }
    }
  });

  return results;
}
