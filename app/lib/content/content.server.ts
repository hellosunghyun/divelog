import type { ContentFormat } from "./editor-extensions";
import * as Sentry from "@sentry/react-router/cloudflare";
import { createModuleLogger } from "../infra/logger.server";

const logger = createModuleLogger("content.server");

type StoredContentFormat = "json" | "plaintext";

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

const BLOCK_NODE_TYPES = new Set([
  "blockquote",
  "bulletList",
  "codeBlock",
  "heading",
  "listItem",
  "orderedList",
  "paragraph",
]);

export function detectContentFormat(content: string): StoredContentFormat {
  return parseTiptapDocument(content) ? "json" : "plaintext";
}

export function getPlainText(content: string, format: ContentFormat): string {
  if (format === "note") {
    return content;
  }

  const document = parseTiptapDocument(content);

  if (!document) {
    return content;
  }

  return extractPlainText(document).replace(/\n{3,}/g, "\n\n").trim();
}

export type MentionSlugMap = Map<string, string>;

export function renderContentToHtml(
  content: string,
  format: ContentFormat,
  mentionSlugMap?: MentionSlugMap,
): string {
  if (format === "note") {
    return renderPlainText(content);
  }

  const document = parseTiptapDocument(content);

  if (!document) {
    return renderPlainText(content);
  }

  try {
    return tiptapJsonToHtml(document, mentionSlugMap);
  } catch (err) {
    Sentry.captureException(err, { tags: { type: "content_render" } });
    logger.error("content_render_failed", { error: err instanceof Error ? err.message : String(err) });
    return renderPlainText(content);
  }
}

function tiptapJsonToHtml(doc: TiptapDocument, mentionSlugMap?: MentionSlugMap): string {
  return renderNode(doc, mentionSlugMap);
}

function renderNode(node: TiptapNode, mentionSlugMap?: MentionSlugMap): string {
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
            const href = escapeHtml(mark.attrs?.href ?? "");
            text = `<a href="${href}">${text}</a>`;
            break;
          }
          case "textStyle": {
            const color = mark.attrs?.color;
            if (color) text = `<span style="color:${escapeHtml(String(color))}">${text}</span>`;
            break;
          }
          case "highlight": {
            const bgColor = mark.attrs?.color;
            text = bgColor ? `<mark style="background-color:${escapeHtml(String(bgColor))}">${text}</mark>` : `<mark>${text}</mark>`;
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

  const children = (node.content ?? []).map((child) => renderNode(child, mentionSlugMap)).join("");

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
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
      const lang = (node.attrs?.language as string) ?? "";
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      return `<pre><code${langAttr}>${children}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "image": {
      const src = escapeHtml((node.attrs?.src as string) ?? "");
      const alt = escapeHtml((node.attrs?.alt as string) ?? "");
      const width = node.attrs?.width ? ` style="width:${escapeHtml(String(node.attrs.width))};max-width:100%"` : "";
      const caption = (node.attrs?.caption as string) ?? "";
      if (caption) {
        return `<figure class="image-figure"><img src="${src}" alt="${alt}"${width}><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
      }
      return `<img src="${src}" alt="${alt}"${width} class="editor-image">`;
    }
    case "userMention":
    case "mention": {
      const storedId = (node.attrs?.id as string) ?? "";
      const storedSlug = (node.attrs?.slug as string) ?? "";
      const resolvedSlug = mentionSlugMap?.get(storedId) ?? (storedSlug || storedId);
      const mentionSlug = escapeHtml(resolvedSlug);
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
      return '<nav class="table-of-contents" data-toc>목차</nav>';
    default:
      return children;
  }
}

function parseTiptapDocument(content: string): TiptapDocument | null {
  try {
    const parsed = JSON.parse(content);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "type" in parsed &&
      parsed.type === "doc"
    ) {
      return parsed as TiptapDocument;
    }

    return null;
  } catch (err) {
    logger.warn("content_parse_failed", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function extractPlainText(node: TiptapNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak" || node.type === "horizontalRule") {
    return "\n";
  }

  if (node.type === "userMention" || node.type === "mention") {
    const label = (node.attrs?.label as string) ?? "";
    return label ? `@${label}` : "";
  }

  if (node.type === "recordRef") {
    return (node.attrs?.label as string) ?? "";
  }

  const childText = (node.content ?? []).map(extractPlainText).join("");

  if (childText.length === 0) {
    return "";
  }

  if (node.type && BLOCK_NODE_TYPES.has(node.type)) {
    return `${childText}\n`;
  }

  return childText;
}

function renderPlainText(content: string): string {
  let html = escapeHtml(content);

  html = html.replace(/@([\wㄱ-ㅎ가-힣]+)/g, (_match, name) => {
    return `<a href="/learners/${name}" class="user-mention">@${name}</a>`;
  });

  html = html.replace(/\[\[(.+?)\]\]/g, (_match, title) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9ㄱ-ㅎ가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `<a href="/logs/${slug}" class="record-ref">${title}</a>`;
  });

  return `<div class="whitespace-pre-wrap">${html}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
