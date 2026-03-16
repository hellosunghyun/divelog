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
import { Extension, EditorContent, useEditor, type Editor } from "@tiptap/react";
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

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/gif,image/jpeg,image/png,image/webp";
    input.style.display = "none";
    const finalize = (file: File | null) => { input.remove(); resolve(file); };
    input.addEventListener("change", () => finalize(input.files?.item(0) ?? null));
    input.addEventListener("cancel", () => finalize(null));
    document.body.appendChild(input);
    input.click();
  });
}

function getCurrentBlockType(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "heading1";
  if (editor.isActive("heading", { level: 2 })) return "heading2";
  if (editor.isActive("heading", { level: 3 })) return "heading3";
  if (editor.isActive("blockquote")) return "blockquote";
  if (editor.isActive("codeBlock")) return "codeBlock";
  return "paragraph";
}

function applyBlockType(editor: Editor, type: string) {
  switch (type) {
    case "heading1": editor.chain().focus().setHeading({ level: 1 }).run(); break;
    case "heading2": editor.chain().focus().setHeading({ level: 2 }).run(); break;
    case "heading3": editor.chain().focus().setHeading({ level: 3 }).run(); break;
    case "blockquote": editor.chain().focus().setBlockquote().run(); break;
    case "codeBlock": editor.chain().focus().setCodeBlock().run(); break;
    default: editor.chain().focus().setParagraph().run();
  }
}

function BubbleBtn({
  onClick,
  isActive,
  label,
  title,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={isActive}
      aria-label={label}
      title={title}
      className="bubble-btn"
    >
      {children}
    </button>
  );
}

const TEXT_COLORS = [
  { color: "#DC2626", label: "빨강" }, { color: "#EA580C", label: "주황" },
  { color: "#CA8A04", label: "노랑" }, { color: "#16A34A", label: "초록" },
  { color: "#146C94", label: "파랑" }, { color: "#7C3AED", label: "보라" },
  { color: "#DB2777", label: "분홍" }, { color: "#92400E", label: "갈색" },
  { color: "#6B7280", label: "회색" }, { color: "#1D1D1F", label: "기본" },
];

const BG_COLORS = [
  { color: "#FEE2E2", label: "빨강" }, { color: "#FFEDD5", label: "주황" },
  { color: "#FEF9C3", label: "노랑" }, { color: "#DCFCE7", label: "초록" },
  { color: "#DBEAFE", label: "파랑" }, { color: "#EDE9FE", label: "보라" },
  { color: "#FCE7F3", label: "분홍" }, { color: "#F5F0E6", label: "갈색" },
  { color: "#F3F4F6", label: "회색" }, { color: "transparent", label: "없음" },
];

function ColorPickerMenu({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentTextColor = editor.getAttributes("textStyle")?.color ?? "";
  const currentBgColor = editor.getAttributes("highlight")?.color ?? "";

  const applyText = (c: string) => {
    if (c === "#1D1D1F") editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(c).run();
    setOpen(false);
  };
  const applyBg = (c: string) => {
    if (c === "transparent") editor.chain().focus().unsetHighlight().run();
    else editor.chain().focus().toggleHighlight({ color: c }).run();
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="색상"
        title="글씨/배경 색상"
        className="min-h-11 rounded px-2 text-sm font-bold transition-colors"
        style={{ color: currentTextColor || "var(--color-text-secondary)", borderBottom: `3px solid ${currentTextColor || "var(--color-text-secondary)"}` }}
      >
        A
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
          marginTop: 6, padding: 6, borderRadius: 12, width: 176,
          border: "1px solid var(--color-border)", background: "var(--color-surface)",
          boxShadow: "0 4px 20px -2px rgba(11,36,71,0.1)", zIndex: 70,
          maxHeight: 360, overflowY: "auto",
        }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "4px 8px", fontWeight: 600 }}>글씨 색상</div>
          {TEXT_COLORS.map((c) => (
            <button key={`t-${c.color}`} type="button"
              className="color-row"
              data-active={currentTextColor === c.color ? "true" : undefined}
              onClick={() => applyText(c.color)}>
              <span className="color-swatch" style={{ color: c.color }}>A</span>
              <span>{c.label}</span>
              {currentTextColor === c.color && <span style={{ marginLeft: "auto" }}>✓</span>}
            </button>
          ))}
          <div style={{ height: 1, background: "var(--color-border)", margin: "4px 0" }} />
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "4px 8px", fontWeight: 600 }}>배경 색상</div>
          {BG_COLORS.map((c) => (
            <button key={`b-${c.color}`} type="button"
              className="color-row"
              data-active={currentBgColor === c.color ? "true" : undefined}
              onClick={() => applyBg(c.color)}>
              <span className="color-bg-swatch" style={{ background: c.color === "transparent" ? "var(--color-surface)" : c.color, border: c.color === "transparent" ? "1px dashed var(--color-border)" : "1px solid var(--color-border)" }} />
              <span>{c.label}</span>
              {currentBgColor === c.color && <span style={{ marginLeft: "auto" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const charCount = editor ? editor.getText().length : 0;

  return (
    <div className={rootClassName}>
      {editor ? (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: currentEditor }) => currentEditor.state.selection.empty === false}
        >
          <div className="bubble-toolbar">
            <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} label="굵게" title="굵게 (⌘B)">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 2h4.5a3 3 0 0 1 0 6H4V2zm0 6h5a3 3 0 0 1 0 6H4V8z" fill="currentColor"/></svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} label="기울임" title="기울임 (⌘I)">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 2h6v2H9.5l-3 8H9v2H3v-2h2.5l3-8H6V2z" fill="currentColor"/></svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} label="밑줄" title="밑줄 (⌘U)">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 2h2v6a3 3 0 0 0 6 0V2h2v6a5 5 0 0 1-10 0V2zm0 11h10v1H3v-1z" fill="currentColor"/></svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} label="취소선" title="취소선">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1a4 4 0 0 0-4 4h2a2 2 0 0 1 4 0c0 .7-.3 1.2-.8 1.6L8 7H1v2h6.5c.3.3.5.7.5 1a2 2 0 0 1-4 0H2a4 4 0 0 0 8 0c0-.9-.3-1.7-.8-2.3L10.5 7H15V5h-3.2A4 4 0 0 0 8 1z" fill="currentColor"/></svg>
            </BubbleBtn>
            <span className="bubble-sep" />
            <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} label="인라인 코드" title="인라인 코드">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.7 4.3L1 8l4.7 3.7 1.3-1.6L4 8l3-2.4L5.7 4.3zm4.6 0L9 5.6 12 8l-3 2.4 1.3 1.6L15 8l-4.7-3.7z" fill="currentColor"/></svg>
            </BubbleBtn>
            <BubbleBtn
              onClick={() => {
                const url = prompt("링크 URL을 입력하세요:");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              isActive={editor.isActive("link")}
              label="링크"
              title="링크 추가"
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6.5 3.5a3.5 3.5 0 0 1 5 5l-1.5 1.5-1-1 1.5-1.5a2 2 0 0 0-2.8-2.8L6.2 6.2l-1-1L6.5 3.5zm3 9a3.5 3.5 0 0 1-5-5L6 6l1 1-1.5 1.5a2 2 0 0 0 2.8 2.8L9.8 9.8l1 1L9.5 12.5zm-5-4l1-1 4-4-1-1-4 4 1 1z" fill="currentColor"/></svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} label="형광펜" title="형광펜">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9.5 1L15 6.5l-7 7-2.5.5.5-2.5L9.5 1zm1.4 1.4L5 8.3l-.3 1.3 1.3-.3 5.9-5.9-1-1zM2 13h5v1H2v-1z" fill="currentColor"/></svg>
            </BubbleBtn>
            <span className="bubble-sep" />
            <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} label="제목 1" title="제목 1">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="1" y="13" fontSize="11" fontWeight="700" fill="currentColor">H1</text></svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} label="제목 2" title="제목 2">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="1" y="13" fontSize="11" fontWeight="700" fill="currentColor">H2</text></svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} label="제목 3" title="제목 3">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="1" y="13" fontSize="11" fontWeight="700" fill="currentColor">H3</text></svg>
            </BubbleBtn>
            <span className="bubble-sep" />
            <ColorPickerMenu editor={editor} />
          </div>
        </BubbleMenu>
      ) : null}

      {editor && (
        <div className="editor-toolbar">
          <select
            className="editor-toolbar-select"
            value={getCurrentBlockType(editor)}
            onChange={(e) => applyBlockType(editor, e.target.value)}
            aria-label="블록 타입"
          >
            <option value="paragraph">본문</option>
            <option value="heading1">제목 1</option>
            <option value="heading2">제목 2</option>
            <option value="heading3">제목 3</option>
            <option value="blockquote">인용구</option>
            <option value="codeBlock">코드 블록</option>
          </select>
          <span className="bubble-sep" style={{ height: 20 }} />
          <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} label="굵게" title="굵게 (⌘B)">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 2h4.5a3 3 0 0 1 0 6H4V2zm0 6h5a3 3 0 0 1 0 6H4V8z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} label="기울임" title="기울임 (⌘I)">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 2h6v2H9.5l-3 8H9v2H3v-2h2.5l3-8H6V2z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} label="밑줄" title="밑줄 (⌘U)">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 2h2v6a3 3 0 0 0 6 0V2h2v6a5 5 0 0 1-10 0V2zm0 11h10v1H3v-1z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} label="취소선" title="취소선">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1a4 4 0 0 0-4 4h2a2 2 0 0 1 4 0c0 .7-.3 1.2-.8 1.6L8 7H1v2h6.5c.3.3.5.7.5 1a2 2 0 0 1-4 0H2a4 4 0 0 0 8 0c0-.9-.3-1.7-.8-2.3L10.5 7H15V5h-3.2A4 4 0 0 0 8 1z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} label="인라인 코드" title="인라인 코드">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.7 4.3L1 8l4.7 3.7 1.3-1.6L4 8l3-2.4L5.7 4.3zm4.6 0L9 5.6 12 8l-3 2.4 1.3 1.6L15 8l-4.7-3.7z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn
            onClick={() => {
              const url = prompt("링크 URL을 입력하세요:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            isActive={editor.isActive("link")}
            label="링크"
            title="링크 추가"
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6.5 3.5a3.5 3.5 0 0 1 5 5l-1.5 1.5-1-1 1.5-1.5a2 2 0 0 0-2.8-2.8L6.2 6.2l-1-1L6.5 3.5zm3 9a3.5 3.5 0 0 1-5-5L6 6l1 1-1.5 1.5a2 2 0 0 0 2.8 2.8L9.8 9.8l1 1L9.5 12.5zm-5-4l1-1 4-4-1-1-4 4 1 1z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} label="형광펜" title="형광펜">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9.5 1L15 6.5l-7 7-2.5.5.5-2.5L9.5 1zm1.4 1.4L5 8.3l-.3 1.3 1.3-.3 5.9-5.9-1-1zM2 13h5v1H2v-1z" fill="currentColor"/></svg>
          </BubbleBtn>
          <span className="bubble-sep" style={{ height: 20 }} />
          <BubbleBtn onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")} label="체크리스트" title="체크리스트">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 3h2v2H2V3zm4 0h8v2H6V3zm-4 5h2v2H2V8zm4 0h8v2H6V8zm-4 5h2v2H2v-2zm4 0h8v2H6v-2z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} isActive={false} label="표" title="표 삽입">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 2h14v12H1V2zm2 2v2h4V4H3zm6 0v2h4V4H9zm-6 4v2h4V8H3zm6 0v2h4V8H9zm-6 4v2h4v-2H3zm6 0v2h4v-2H9z" fill="currentColor"/></svg>
          </BubbleBtn>
          <BubbleBtn
            onClick={async () => {
              const file = await pickImageFile();
              if (file) {
                try {
                  const src = await uploadImage(file);
                  editor.chain().focus().setImage({ src, alt: file.name }).run();
                } catch (e) {
                  setEditorError(e instanceof Error ? e.message : "이미지 업로드 실패");
                }
              }
            }}
            isActive={false}
            label="이미지"
            title="이미지 삽입"
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 2h14v12H1V2zm2 2v8h10V4H3zm1 6l2-3 2 2 2-3 3 4H4z" fill="currentColor"/></svg>
          </BubbleBtn>
        </div>
      )}

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

      <div className="editor-footer">
        <span className="editor-char-count">{charCount.toLocaleString()} 자</span>
      </div>

      {name ? <input type="hidden" name={name} value={jsonValue} readOnly /> : null}
    </div>
  );
}

export default ArticleEditor;
