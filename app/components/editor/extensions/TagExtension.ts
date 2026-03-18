import { Mention } from "@tiptap/extension-mention";
import { PluginKey, EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";

const tagPluginKey = new PluginKey("inlineTag");

interface TagItem { id: string; label: string }

const TAGS: TagItem[] = [
  { id: "회고", label: "회고" }, { id: "Swift", label: "Swift" },
  { id: "SwiftUI", label: "SwiftUI" }, { id: "UIKit", label: "UIKit" },
  { id: "팀워크", label: "팀워크" }, { id: "질문", label: "질문" },
  { id: "발견", label: "발견" }, { id: "CBL", label: "CBL" },
  { id: "도전", label: "도전" }, { id: "성찰", label: "성찰" },
  { id: "디자인", label: "디자인" }, { id: "프로토타입", label: "프로토타입" },
  { id: "피드백", label: "피드백" }, { id: "Xcode", label: "Xcode" },
];

function filterTags(query: string) {
  if (!query) return TAGS.slice(0, 8);
  const q = query.toLowerCase();
  return TAGS.filter((t) => t.label.toLowerCase().includes(q)).slice(0, 8);
}

export function createInlineTagExtension() {
  return Mention.extend({ name: "inlineTag" }).configure({
    HTMLAttributes: { class: "inline-tag" },
    renderText: ({ node }: { node: { attrs: Record<string, unknown> } }) => `#${node.attrs.label ?? node.attrs.id}`,
    suggestion: {
      char: "#",
      pluginKey: tagPluginKey,
      allow: ({ state }: { editor: Editor; state: EditorState }) => {
        const parent = state.selection.$from.parent;
        return parent.isTextblock && !parent.type.spec.code;
      },
      items: ({ query }: { query: string }) => filterTags(query),
      command: ({ editor, range, props }: { editor: Editor; range: Range; props: unknown }) => {
        const item = props as TagItem;
        exitSuggestion(editor.view, tagPluginKey);
        editor.chain().focus().insertContentAt(range, [
          { type: "inlineTag", attrs: { id: item.id, label: item.label } },
          { type: "text", text: " " },
        ]).run();
      },
      render: () => {
        let popup: HTMLDivElement | null = null;
        let selectedIndex = 0;
        let currentProps: SuggestionProps<TagItem> | null = null;
        let scrollHandler: (() => void) | null = null;

        const update = () => {
          if (!popup || !currentProps) return;
          popup.innerHTML = "";
          if (currentProps.items.length === 0) {
            const empty = document.createElement("div");
            empty.style.cssText = "padding:12px 16px;font-size:13px;color:var(--color-text-tertiary)";
            empty.textContent = "태그를 찾을 수 없습니다";
            popup.appendChild(empty);
            return;
          }
          currentProps.items.forEach((item, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.style.cssText = `width:100%;display:flex;align-items:center;padding:6px 12px;border:none;border-radius:8px;cursor:pointer;text-align:left;font-size:14px;color:var(--color-text-primary);transition:background 100ms;background:${i === selectedIndex ? "var(--color-surface-secondary)" : "transparent"}`;
            btn.textContent = `#${item.label}`;
            btn.addEventListener("mouseenter", () => { selectedIndex = i; update(); });
            btn.addEventListener("mousedown", (e) => e.preventDefault());
            btn.addEventListener("click", () => currentProps?.command(item));
            popup!.appendChild(btn);
          });
        };
        const position = () => {
          if (!popup || !currentProps?.clientRect) return;
          const rect = currentProps.clientRect();
          if (!rect) return;
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 6}px`;
        };

        return {
          onStart: (props: SuggestionProps<TagItem>) => {
            selectedIndex = 0; currentProps = props;
            popup = document.createElement("div");
            popup.style.cssText = "position:fixed;z-index:60;min-width:180px;max-width:260px;padding:4px;border-radius:12px;border:1px solid var(--color-border);background:var(--color-surface);box-shadow:0 4px 20px -2px rgba(11,36,71,0.08)";
            document.body.appendChild(popup);
            update(); position();
            scrollHandler = () => position();
            window.addEventListener("scroll", scrollHandler, true);
          },
          onUpdate: (props: SuggestionProps<TagItem>) => { selectedIndex = 0; currentProps = props; update(); position(); },
           onKeyDown: ({ event, view }: { event: KeyboardEvent; view: EditorView }) => {
            if (!currentProps || !popup || currentProps.items.length === 0) return false;
            if (event.isComposing || event.keyCode === 229) { return false; }
            if (event.key === "ArrowUp") { event.preventDefault(); selectedIndex = (selectedIndex + currentProps.items.length - 1) % currentProps.items.length; update(); return true; }
            if (event.key === "ArrowDown") { event.preventDefault(); selectedIndex = (selectedIndex + 1) % currentProps.items.length; update(); return true; }
            if (event.key === "Enter") { event.preventDefault(); const item = currentProps.items[selectedIndex]; if (item) currentProps.command(item); return true; }
            if (event.key === "Escape") { event.preventDefault(); exitSuggestion(view, tagPluginKey); return true; }
            return false;
          },
          onExit: () => { popup?.remove(); popup = null; currentProps = null; if (scrollHandler) { window.removeEventListener("scroll", scrollHandler, true); scrollHandler = null; } },
        };
      },
    },
  });
}
