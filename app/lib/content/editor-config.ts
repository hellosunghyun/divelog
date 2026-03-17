/**
 * Tiptap Editor Configuration
 * Shared extension definitions and editor settings for all editor instances
 * Used by both client and server-side editor components
 */

import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Image } from "@tiptap/extension-image";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Underline } from "@tiptap/extension-underline";
import { common, createLowlight } from "lowlight";

/**
 * Lowlight instance for syntax highlighting in code blocks
 * Supports common programming languages
 */
const lowlight = createLowlight(common);

/**
 * Base Tiptap extensions used across all editor instances
 * These extensions provide core editing functionality:
 * - StarterKit: Document, Paragraph, Text, Bold, Italic, Strike, Code, Heading, BulletList, OrderedList, BlockQuote, HorizontalRule, CodeBlock, HardBreak
 * - Placeholder: Shows placeholder text when editor is empty
 * - Image: Allows image insertion (Phase 2 feature, configured but not yet enabled in UI)
 * - CodeBlockLowlight: Syntax-highlighted code blocks
 * - Underline: Text underline support
 */
export const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    // Disable default CodeBlock in favor of CodeBlockLowlight
    codeBlock: false,
    // Disable HardBreak to prevent unwanted line breaks
    hardBreak: false,
  }),
  Placeholder.configure({
    placeholder: "무엇이 남았는지부터 적어도 좋습니다.",
    emptyEditorClass: "is-editor-empty",
  }),
  Image.configure({
    allowBase64: false,
    HTMLAttributes: {
      class: "editor-image",
    },
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: "plaintext",
  }),
  Underline,
];

/**
 * Common editor configuration options
 * Applied to all editor instances for consistency
 */
export const EDITOR_CONFIG = {
  // Disable autofocus by default (can be overridden per instance)
  autofocus: false,
  // Enable spell checking
  spellcheck: true,
  // Preserve whitespace in content
  preserveWhitespace: true,
} as const;

/**
 * Editor content type definitions
 * Used for validation and type safety
 */
export type EditorContent = string | Record<string, any> | null | undefined;

/**
 * Editor instance options
 * Customizable per editor instance
 */
export interface EditorOptions {
  placeholder?: string;
  autofocus?: boolean;
  editable?: boolean;
  content?: EditorContent;
}
