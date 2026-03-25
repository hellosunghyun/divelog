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

export function renderArticlePreviewHtml(content: string): string {
  const parsed = parseContent(content);

  if (!parsed) {
    return renderPlainText(content);
  }

  return generateHTML(parsed, previewExtensions);
}
