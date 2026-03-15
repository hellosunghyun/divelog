import type { ContentFormat } from "./editor-extensions";

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

export function renderContentToHtml(content: string, format: ContentFormat): string {
  if (format === "note") {
    return renderPlainText(content);
  }

  const document = parseTiptapDocument(content);

  if (!document) {
    return renderPlainText(content);
  }

  try {
    return tiptapJsonToHtml(document);
  } catch (err) {
    console.error("[renderContentToHtml] tiptapJsonToHtml failed:", err);
    return renderPlainText(content);
  }
}

function tiptapJsonToHtml(doc: TiptapDocument): string {
  return renderNode(doc);
}

function renderNode(node: TiptapNode): string {
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
        }
      }
    }

    return text;
  }

  const children = (node.content ?? []).map(renderNode).join("");

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
      return `<img src="${src}" alt="${alt}" class="editor-image">`;
    }
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
  } catch {
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
  return `<div class="whitespace-pre-wrap">${escapeHtml(content)}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
