/**
 * Thread tree utilities for building hierarchical response structures.
 * Converts flat response arrays into nested tree structures with depth tracking.
 */

export type ThreadedResponse<T> = T & {
  children: ThreadedResponse<T>[];
  depth: number;
};

/**
 * Builds a hierarchical tree structure from a flat array of responses.
 *
 * @param flat - Array of responses with id and parentResponseId fields
 * @returns Array of root responses with nested children and depth information
 *
 * @example
 * const responses = [
 *   { id: '1', parentResponseId: null, content: 'Root' },
 *   { id: '2', parentResponseId: '1', content: 'Child' },
 *   { id: '3', parentResponseId: '2', content: 'Grandchild' },
 * ];
 * const tree = buildResponseTree(responses);
 * // tree[0].children[0].children[0].depth === 2
 */
export function buildResponseTree<T extends { id: string; parentResponseId: string | null }>(
  flat: T[]
): ThreadedResponse<T>[] {
  const map = new Map<string, ThreadedResponse<T>>();
  const roots: ThreadedResponse<T>[] = [];

  // First pass: create all nodes with empty children and depth 0
  for (const response of flat) {
    map.set(response.id, {
      ...response,
      children: [],
      depth: 0,
    });
  }

  // Second pass: build parent-child relationships and calculate depths
  for (const response of flat) {
    const node = map.get(response.id)!;

    if (response.parentResponseId && map.has(response.parentResponseId)) {
      // Parent exists: add to parent's children and set depth
      const parent = map.get(response.parentResponseId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      // No parent or parent doesn't exist: treat as root
      roots.push(node);
    }
  }

  return roots;
}
