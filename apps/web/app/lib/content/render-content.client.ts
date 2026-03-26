import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table as TiptapTable } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";

import { Callout } from "~/components/editor/extensions/CalloutExtension";
import { createUserMentionExtension } from "~/components/editor/extensions/MentionExtension";
import { createRecordRefExtension } from "~/components/editor/extensions/RecordRefExtension";
import { ResizableImage } from "~/components/editor/extensions/ResizableImage";
import { createInlineTagExtension } from "~/components/editor/extensions/TagExtension";
import { TocExtension } from "~/components/editor/extensions/TocExtension";
import { ToggleBlock } from "~/components/editor/extensions/ToggleExtension";

const lowlight = createLowlight(common);

type TiptapMark = {
  type: string;
  attrs?: Record<string, string>;
};

type TiptapNode = {
  content?: TiptapNode[];
  text?: string;
  type?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
};

type TiptapDocument = TiptapNode & {
  type: "doc";
};

type TocHeading = {
  id: string;
  level: 1 | 2 | 3 | 4;
  text: string;
};

type TocTreeNode = TocHeading & {
  children: TocTreeNode[];
};

type RenderContext = {
  headingIndex: number;
  tocHeadings: TocHeading[];
};

type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const BLOCK_NODE_TYPES = new Set([
  "blockquote",
  "bulletList",
  "codeBlock",
  "heading",
  "listItem",
  "orderedList",
  "paragraph",
]);

const previewExtensions = [
  StarterKit.configure({ codeBlock: false }),
  Underline,
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: "swift",
  }),
  ResizableImage.configure({ allowBase64: false }),
  TextStyle,
  Color,
  TiptapLink.configure({ autolink: true, openOnClick: false, defaultProtocol: "https" }),
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TiptapTable.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  Superscript,
  Subscript,
  Callout,
  ToggleBlock,
  TocExtension,
  createUserMentionExtension(),
  createRecordRefExtension(),
  createInlineTagExtension(),
];

function parseContent(content: string): JSONContent | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as JSONContent;
    }
  } catch {
    return null;
  }

  return null;
}

function parseTiptapDocument(content: string): TiptapDocument | null {
  try {
    const parsed = JSON.parse(content) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "type" in parsed &&
      parsed.type === "doc"
    ) {
      return parsed as TiptapDocument;
    }
  } catch {
    return null;
  }

  return null;
}

function escapeHtml(content: string): string {
  return content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPlainText(content: string): string {
  return `<div class="whitespace-pre-wrap">${escapeHtml(content)}</div>`;
}

function renderStoredNode(node: TiptapNode, context: RenderContext): string {
  if (node.type === "text") {
    let text = escapeHtml(node.text ?? "");

    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case "bold":
            text = `<strong>${text}</strong>`;
            break;
          case "italic":
            text = `<em>${text}</em>`;
            break;
          case "underline":
            text = `<u>${text}</u>`;
            break;
          case "strike":
            text = `<s>${text}</s>`;
            break;
          case "code":
            text = `<code>${text}</code>`;
            break;
          case "link": {
            const rawHref = mark.attrs?.href ?? "";
            const href = isSafeUrl(rawHref) ? escapeHtml(rawHref) : "";
            text = `<a href="${href}">${text}</a>`;
            break;
          }
          case "textStyle": {
            const color = mark.attrs?.color;
            if (color) {
              text = `<span style="color:${escapeHtml(String(color))}">${text}</span>`;
            }
            break;
          }
          case "highlight": {
            const bgColor = mark.attrs?.color;
            text = bgColor
              ? `<mark style="background-color:${escapeHtml(String(bgColor))}">${text}</mark>`
              : `<mark>${text}</mark>`;
            break;
          }
          case "superscript":
            text = `<sup>${text}</sup>`;
            break;
          case "subscript":
            text = `<sub>${text}</sub>`;
            break;
        }
      }
    }

    return text;
  }

  const children = (node.content ?? []).map((child) => renderStoredNode(child, context)).join("");

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = getHeadingLevel(node);

      if (level >= 1 && level <= 4) {
        const tocHeading = context.tocHeadings[context.headingIndex];
        context.headingIndex += 1;
        const idAttr = tocHeading ? ` id="${escapeHtml(tocHeading.id)}"` : "";
        return `<h${level}${idAttr}>${children}</h${level}>`;
      }

      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "codeBlock": {
      const language =
        typeof node.attrs?.language === "string" ? node.attrs.language.trim().toLowerCase() : "";
      const rawCode = extractCodeBlockText(node);

      if (!rawCode) {
        return "<pre><code></code></pre>";
      }

      if (language && lowlight.registered(language)) {
        try {
          const highlighted = lowlight.highlight(language, rawCode) as HastNode;
          const highlightedHtml = generateHtmlFromHast(highlighted);
          return `<pre><code class="hljs language-${escapeHtml(language)}">${highlightedHtml}</code></pre>`;
        } catch {
          return `<pre><code>${escapeHtml(rawCode)}</code></pre>`;
        }
      }

      return `<pre><code>${escapeHtml(rawCode)}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "image": {
      const rawSrc = (node.attrs?.src as string) ?? "";
      const src = isSafeUrl(rawSrc) ? escapeHtml(rawSrc) : "";
      const alt = escapeHtml((node.attrs?.alt as string) ?? "");
      const width = node.attrs?.width
        ? ` style="width:${escapeHtml(String(node.attrs.width))};max-width:100%"`
        : "";
      const caption = (node.attrs?.caption as string) ?? "";

      if (caption) {
        return `<figure class="image-figure"><img src="${src}" alt="${alt}"${width}><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
      }

      return `<img src="${src}" alt="${alt}"${width} class="editor-image">`;
    }
    case "userMention":
    case "mention": {
      const storedId = (node.attrs?.id as string) ?? "";
      const storedSlug = (node.attrs?.slug as string) ?? storedId;
      const mentionSlug = escapeHtml(storedSlug);
      const mentionLabel = escapeHtml((node.attrs?.label as string) ?? "");
      return `<a href="/learners/${mentionSlug}" class="user-mention" data-user-id="${escapeHtml(storedId)}">@${mentionLabel}</a>`;
    }
    case "recordRef": {
      const refSlug = escapeHtml((node.attrs?.slug as string) ?? (node.attrs?.id as string) ?? "");
      const refLabel = escapeHtml((node.attrs?.label as string) ?? "");
      return `<a href="/logs/${refSlug}" class="record-ref" data-record-id="${escapeHtml((node.attrs?.id as string) ?? "")}">${refLabel}</a>`;
    }
    case "callout": {
      const calloutType = escapeHtml((node.attrs?.type as string) ?? "info");
      return `<div class="callout" data-callout-type="${calloutType}">${children}</div>`;
    }
    case "toggleBlock": {
      const summary = escapeHtml((node.attrs?.summary as string) ?? "클릭하여 펼치기");
      return `<details class="toggle-block" open><summary>${summary}</summary><div class="toggle-content">${children}</div></details>`;
    }
    case "taskList":
      return `<ul data-type="taskList">${children}</ul>`;
    case "taskItem": {
      const checked = node.attrs?.checked ? "true" : "false";
      return `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox" ${node.attrs?.checked ? "checked" : ""} disabled></label><div>${children}</div></li>`;
    }
    case "table":
      return `<table>${children}</table>`;
    case "tableRow":
      return `<tr>${children}</tr>`;
    case "tableCell":
      return `<td>${children}</td>`;
    case "tableHeader":
      return `<th>${children}</th>`;
    case "inlineTag": {
      const tagId = escapeHtml((node.attrs?.id as string) ?? "");
      const tagLabel = escapeHtml((node.attrs?.label as string) ?? "");
      return `<span class="inline-tag" data-tag="${tagId}">#${tagLabel}</span>`;
    }
    case "toc":
      return renderToc(extractTocHeadingsFromStoredDoc(context.tocHeadings));
    default:
      return children;
  }
}

function generateHtmlFromHast(node: HastNode): string {
  if (node.type === "text") {
    return escapeHtml(node.value ?? "");
  }

  if (node.type !== "element") {
    return (node.children ?? []).map((child) => generateHtmlFromHast(child)).join("");
  }

  const attributes = Object.entries(node.properties ?? {})
    .flatMap(([key, value]) => {
      if (value == null || value === false) {
        return [];
      }

      if (value === true) {
        return [key];
      }

      const normalizedValue = Array.isArray(value) ? value.join(" ") : String(value);
      return [`${key}="${escapeHtml(normalizedValue)}"`];
    })
    .join(" ");
  const attributePrefix = attributes ? ` ${attributes}` : "";
  const children = (node.children ?? []).map((child) => generateHtmlFromHast(child)).join("");

  return `<${node.tagName ?? "div"}${attributePrefix}>${children}</${node.tagName ?? "div"}>`;
}

function extractCodeBlockText(node: TiptapNode): string {
  if (!node.content || node.content.length === 0) {
    return "";
  }

  return node.content.map(collectCodeText).join("");
}

function collectCodeText(node: TiptapNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (!node.content || node.content.length === 0) {
    return "";
  }

  return node.content.map(collectCodeText).join("");
}

function extractTocHeadings(doc: TiptapDocument): TocHeading[] {
  const tocHeadings: TocHeading[] = [];
  const usedIds = new Map<string, number>();

  walkNodes(doc, (node) => {
    if (node.type !== "heading") {
      return;
    }

    const level = getTocHeadingLevel(node);
    if (!level) {
      return;
    }

    const headingText = normalizeHeadingText(extractNodeText(node));
    const slug = createHeadingId(headingText);
    const baseId = slug || "section";
    const occurrence = (usedIds.get(baseId) ?? 0) + 1;
    usedIds.set(baseId, occurrence);

    tocHeadings.push({
      id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`,
      level,
      text: slug ? headingText : `섹션 ${tocHeadings.length + 1}`,
    });
  });

  return tocHeadings;
}

function extractTocHeadingsFromStoredDoc(tocHeadings: TocHeading[]): TocHeading[] {
  return tocHeadings;
}

function walkNodes(node: TiptapNode, visit: (node: TiptapNode) => void): void {
  visit(node);

  for (const child of node.content ?? []) {
    walkNodes(child, visit);
  }
}

function getHeadingLevel(node: TiptapNode): 1 | 2 | 3 | 4 | 5 | 6 {
  const rawLevel = node.attrs?.level;
  const numericLevel = typeof rawLevel === "number" ? rawLevel : Number(rawLevel);

  if (Number.isInteger(numericLevel) && numericLevel >= 1 && numericLevel <= 6) {
    return numericLevel as 1 | 2 | 3 | 4 | 5 | 6;
  }

  return 2;
}

function getTocHeadingLevel(node: TiptapNode): TocHeading["level"] | null {
  const level = getHeadingLevel(node);
  return isTocHeadingLevel(level) ? level : null;
}

function isTocHeadingLevel(level: number): level is TocHeading["level"] {
  return level === 1 || level === 2 || level === 3 || level === 4;
}

function extractNodeText(node: TiptapNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return " ";
  }

  if (node.type === "userMention" || node.type === "mention") {
    const label = (node.attrs?.label as string) ?? "";
    return label ? `@${label}` : "";
  }

  if (node.type === "recordRef") {
    return (node.attrs?.label as string) ?? "";
  }

  return (node.content ?? []).map(extractNodeText).join("");
}

function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function createHeadingId(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function renderToc(tocHeadings: TocHeading[]): string {
  const items = renderTocItems(buildTocTree(tocHeadings));

  return items.length > 0
    ? `<nav class="table-of-contents" data-toc><p>목차</p><ol>${items}</ol></nav>`
    : '<nav class="table-of-contents" data-toc><p>목차</p></nav>';
}

function buildTocTree(tocHeadings: TocHeading[]): TocTreeNode[] {
  const root: TocTreeNode[] = [];
  const stack: TocTreeNode[] = [];

  for (const heading of tocHeadings) {
    const node: TocTreeNode = { ...heading, children: [] };

    while (stack.length > 0 && stack[stack.length - 1]?.level >= heading.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else {
      root.push(node);
    }

    stack.push(node);
  }

  return root;
}

function renderTocItems(nodes: TocTreeNode[]): string {
  const displayLabels = getTocDisplayLabels(nodes);

  return nodes
    .map((node, index) => {
      const children = node.children.length > 0 ? `<ol>${renderTocItems(node.children)}</ol>` : "";
      const displayLabel = displayLabels[index] ?? node.text;

      return `<li data-level="${node.level}"><a href="#${escapeHtml(node.id)}">${escapeHtml(displayLabel)}</a>${children}</li>`;
    })
    .join("");
}

function getTocDisplayLabels(nodes: TocTreeNode[]): string[] {
  if (!shouldStripSiblingNumberPrefixes(nodes)) {
    return nodes.map((node) => node.text);
  }

  return nodes.map((node, index) => stripExactSiblingNumberPrefix(node.text, index + 1));
}

function shouldStripSiblingNumberPrefixes(nodes: TocTreeNode[]): boolean {
  return nodes.length > 0 && nodes.every((node, index) => hasExactSiblingNumberPrefix(node.text, index + 1));
}

function hasExactSiblingNumberPrefix(text: string, index: number): boolean {
  return text.startsWith(`${index}. `);
}

function stripExactSiblingNumberPrefix(text: string, index: number): string {
  const prefix = `${index}. `;
  return text.startsWith(prefix) ? text.slice(prefix.length).trimStart() : text;
}

function isSafeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("#")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function renderStoredArticleHtml(content: string): string {
  const parsed = parseTiptapDocument(content);

  if (!parsed) {
    return renderPlainText(content);
  }

  const tocHeadings = extractTocHeadings(parsed);

  return renderStoredNode(parsed, {
    headingIndex: 0,
    tocHeadings,
  });
}

export function renderArticlePreviewHtml(content: string): string {
  const parsed = parseContent(content);

  if (!parsed) {
    return renderPlainText(content);
  }

  return generateHTML(parsed, previewExtensions);
}
