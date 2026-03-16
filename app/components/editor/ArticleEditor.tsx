"use client";

import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { ResizableImage } from "./ResizableImage";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Underline } from "@tiptap/extension-underline";
import { Extension, EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { StarterKit } from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { Callout } from "./CalloutExtension";
import { createInlineTagExtension } from "./TagExtension";
import { TocExtension } from "./TocExtension";
import { ToggleBlock } from "./ToggleExtension";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSlashCommandExtension } from "./SlashCommandMenu";
import { createUserMentionExtension } from "./MentionExtension";
import { createRecordRefExtension } from "./RecordRefExtension";

const lowlight = createLowlight(common);
const MAX_CONTENT_SIZE = 100 * 1024;

interface ArticleEditorProps {
  content?: string;
  onChange?: (json: string) => void;
  className?: string;
  placeholder?: string;
  name?: string;
}

function parseContent(content?: string): Record<string, unknown> | undefined {
  if (!content) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function ArticleEditor({
  content,
  onChange,
  className,
  placeholder,
  name,
}: ArticleEditorProps) {
  const parsedContent = useMemo(() => parseContent(content), [content]);
  const [jsonValue, setJsonValue] = useState<string>(content ?? "");
  const lastSyncedRef = useRef(content ?? "");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const { compressImage } = await import("../../lib/compress-image");
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressed);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; url?: string };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? "이미지 업로드에 실패했습니다.");
    }

    return payload.url;
  }, []);

  const slashCommandExtension = useMemo(
    () =>
      createSlashCommandExtension({
        uploadImage,
        onError: (message) => {
          setEditorError(message);
        },
      }),
    [uploadImage],
  );

  const formSubmitExtension = useMemo(
    () =>
      Extension.create({
        name: "formSubmit",
        addKeyboardShortcuts() {
          return {
            "Mod-Enter": () => {
              const editorEl = this.editor.view.dom;
              const form = editorEl.closest("form");
              if (form) {
                const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
                submitButton?.click();
              }
              return true;
            },
          };
        },
      }),
    [],
  );

  const userMentionExtension = useMemo(() => createUserMentionExtension(), []);
  const recordRefExtension = useMemo(() => createRecordRefExtension(), []);
  const inlineTagExtension = useMemo(() => createInlineTagExtension(), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder:
          placeholder ??
          "여기에 글을 쓰세요. `@`로 러너를 태그하고, `[[`로 기록을 참조할 수 있습니다.",
      }),
      Underline,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "swift",
      }),
      ResizableImage.configure({ allowBase64: false }),
      TextStyle,
      Color,
      Link.configure({ autolink: true, openOnClick: false, defaultProtocol: "https" }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Superscript,
      Subscript,
      Callout,
      ToggleBlock,
      TocExtension,
      slashCommandExtension,
      formSubmitExtension,
      userMentionExtension,
      recordRefExtension,
      inlineTagExtension,
    ],
    content: parsedContent,
    editorProps: {
      handlePaste: (view, event) => {
        const html = event.clipboardData?.getData("text/html")?.trim();
        if (!html) {
          return false;
        }

        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, "text/html");

        parsed.body.querySelectorAll("*").forEach((element) => {
          element.removeAttribute("style");
        });

        const sanitizedHtml = parsed.body.innerHTML.trim();
        if (!sanitizedHtml) {
          return false;
        }

        event.preventDefault();
        view.pasteHTML(sanitizedHtml, event);
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextValue = JSON.stringify(currentEditor.getJSON());

      const jsonSize = new TextEncoder().encode(nextValue).length;
      if (jsonSize > MAX_CONTENT_SIZE) {
        setEditorError("본문이 100KB를 초과해 저장할 수 없습니다. 내용을 정리해주세요.");
        return;
      }

      setEditorError(null);
      lastSyncedRef.current = nextValue;
      setJsonValue(nextValue);
      onChange?.(nextValue);
    },
  });

  const insertImageFile = useCallback(
    async (editorFile: File, position?: { left: number; top: number }) => {
      if (!editor) {
        return;
      }

      try {
        setEditorError(null);
        const src = await uploadImage(editorFile);

        const chain = editor.chain().focus();

        if (position) {
          const coords = editor.view.posAtCoords(position);
          if (coords) {
            chain.setTextSelection(coords.pos);
          }
        }

        chain.setImage({ src, alt: editorFile.name }).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
        setEditorError(message);
      }
    },
    [editor, uploadImage],
  );

  useEffect(() => {
    if (!editor) return;
    const incoming = content ?? "";
    if (incoming === lastSyncedRef.current) return;

    if (!incoming) {
      editor.commands.clearContent(false);
      setJsonValue("");
      lastSyncedRef.current = "";
      return;
    }

    const parsed = parseContent(incoming);
    if (!parsed) return;

    editor.commands.setContent(parsed, { emitUpdate: false });
    setJsonValue(incoming);
    lastSyncedRef.current = incoming;
  }, [content, editor]);

  const rootClassName = [
    "article-editor",
    isFocused && "article-editor--focused",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      {editor ? (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: currentEditor }) => currentEditor.state.selection.empty === false}
        >
          <div
            className="flex items-center gap-1 p-1"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive("bold")}
              aria-label="굵게"
              title="굵게 (⌘B)"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("bold")
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("bold")
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              B
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive("italic")}
              aria-label="기울임"
              title="기울임 (⌘I)"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("italic")
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("italic")
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              I
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              data-active={editor.isActive("underline")}
              aria-label="밑줄"
              title="밑줄 (⌘U)"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("underline")
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("underline")
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              U
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              data-active={editor.isActive("heading", { level: 1 })}
              aria-label="제목 1"
              title="제목 1"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("heading", { level: 1 })
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("heading", { level: 1 })
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              H1
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              data-active={editor.isActive("heading", { level: 2 })}
              aria-label="제목 2"
              title="제목 2"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("heading", { level: 2 })
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("heading", { level: 2 })
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              H2
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              data-active={editor.isActive("code")}
              aria-label="인라인 코드"
              title="인라인 코드"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("code")
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("code")
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              Code
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              data-active={editor.isActive("codeBlock")}
              aria-label="코드 블록"
              title="코드 블록"
              className="min-h-11 min-w-11 rounded px-2 text-sm font-semibold transition-colors"
              style={{
                color: editor.isActive("codeBlock")
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: editor.isActive("codeBlock")
                  ? "var(--color-surface-secondary)"
                  : "transparent",
              }}
            >
              ```
            </button>
          </div>
        </BubbleMenu>
      ) : null}

      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:p-5"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onDrop={(event) => {
          const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
          const imageFile = droppedFiles.find((file) => file.type.startsWith("image/"));

          if (!imageFile) {
            return;
          }

          event.preventDefault();
          void insertImageFile(imageFile, { left: event.clientX, top: event.clientY });
        }}
        onPaste={(event) => {
          const pastedFiles = Array.from(event.clipboardData?.files ?? []);
          const imageFile = pastedFiles.find((file) => file.type.startsWith("image/"));

          if (!imageFile) {
            return;
          }

          event.preventDefault();
          void insertImageFile(imageFile);
        }}
      />

      {editorError ? (
        <p className="mt-2 text-sm" style={{ color: "var(--color-error, #A13A3A)" }}>
          {editorError}
        </p>
      ) : null}

      {name ? <input type="hidden" name={name} value={jsonValue} readOnly /> : null}
    </div>
  );
}

export default ArticleEditor;
