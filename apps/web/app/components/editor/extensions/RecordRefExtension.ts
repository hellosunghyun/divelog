import { Mention } from "@tiptap/extension-mention";
import { PluginKey, EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import { disassemble, getChoseong } from "es-hangul";
import type { Editor, Range } from "@tiptap/core";

interface RecordItem {
  id: string;
  slug: string;
  title: string;
  format: string;
  authorDisplayName: string | null;
}

const LOADING_SENTINEL: RecordItem = { id: "__loading__", slug: "", title: "", format: "", authorDisplayName: null };
const recordRefPluginKey = new PluginKey("recordRef");

let allRecords: RecordItem[] | null = null;
let loadPromise: Promise<RecordItem[]> | null = null;

function hangulIncludes(target: string, search: string): boolean {
  const dt = disassemble(target);
  const ds = disassemble(search);
  if (dt.includes(ds)) return true;
  const ct = getChoseong(target);
  if (ct.includes(search)) return true;
  return target.toLowerCase().includes(search.toLowerCase());
}

function loadAllRecords(): Promise<RecordItem[]> {
  if (allRecords !== null) return Promise.resolve(allRecords);
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/api/search-records?q=&all=true")
    .then((res) => (res.ok ? (res.json() as Promise<{ results: RecordItem[] }>) : { results: [] as RecordItem[] }))
    .then((data) => {
      allRecords = data.results ?? [];
      loadPromise = null;
      return allRecords;
    })
    .catch(() => {
      loadPromise = null;
      return [] as RecordItem[];
    });

  return loadPromise;
}

function filterRecords(query: string): RecordItem[] {
  if (!allRecords) return [LOADING_SENTINEL];
  if (!query) return allRecords;
  return allRecords.filter((item) => hangulIncludes(item.title, query));
}

function createRecordPopup() {
  const popup = document.createElement("div");
  popup.dataset.role = "record-ref-popup";
  popup.style.cssText = "position:fixed;z-index:60;min-width:260px;max-width:360px;padding:4px;border-radius:12px;border:1px solid var(--color-border);background:var(--color-surface);box-shadow:0 4px 20px -2px rgba(11,36,71,0.08)";
  return popup;
}

function renderRecordList(
  container: HTMLElement,
  items: RecordItem[],
  selectedIndex: number,
  onSelect: (item: RecordItem) => void,
) {
  container.innerHTML = "";

  if (items.length === 1 && items[0] === LOADING_SENTINEL) {
    const el = document.createElement("div");
    el.style.cssText = "padding:12px 16px;font-size:13px;color:var(--color-text-tertiary)";
    el.textContent = "검색 중…";
    container.appendChild(el);
    return;
  }

  if (items.length === 0) {
    const el = document.createElement("div");
    el.style.cssText = "padding:12px 16px;font-size:13px;color:var(--color-text-tertiary)";
    el.textContent = "기록을 찾을 수 없습니다";
    container.appendChild(el);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.style.cssText = `width:100%;display:flex;flex-direction:column;gap:2px;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;text-align:left;color:var(--color-text-primary);transition:background 150ms;background:${index === selectedIndex ? "var(--color-surface-secondary)" : "transparent"}`;

    const title = document.createElement("span");
    title.style.cssText = "font-size:14px;font-weight:600;line-height:1.3";
    title.textContent = item.title;
    row.appendChild(title);

    const meta = document.createElement("span");
    meta.style.cssText = "font-size:12px;color:var(--color-text-tertiary);line-height:1.3";
    meta.textContent = `${item.format === "note" ? "노트" : "글"} · ${item.authorDisplayName ?? ""}`;
    row.appendChild(meta);

    row.addEventListener("mouseenter", () => {
      container.querySelectorAll("button").forEach((btn, i) => {
        (btn as HTMLElement).style.background = i === index ? "var(--color-surface-secondary)" : "transparent";
      });
    });
    row.addEventListener("mousedown", (e) => e.preventDefault());
    row.addEventListener("click", () => onSelect(item));
    container.appendChild(row);
  });
}

export function createRecordRefExtension() {
  loadAllRecords();

  return Mention.extend({
    name: "recordRef",
    addAttributes() {
      return {
        ...this.parent?.(),
        slug: { default: null },
      };
    },
    renderText: ({ node }: { node: { attrs: Record<string, unknown> } }) => (node.attrs.label as string) ?? (node.attrs.id as string),
  }).configure({
    HTMLAttributes: { class: "record-ref" },
    suggestion: {
      char: "[[",
      pluginKey: recordRefPluginKey,
      allowedPrefixes: null,
      allowSpaces: true,
      allow: ({ state }: { editor: Editor; state: EditorState }) => {
        const parent = state.selection.$from.parent;
        return parent.isTextblock && !parent.type.spec.code;
      },
      items: ({ query }: { query: string }) => filterRecords(query),
      command: ({ editor, range, props }: { editor: Editor; range: Range; props: unknown }) => {
        const item = props as RecordItem;
        if (item.id === "__loading__") return;
        const label = item.title ?? item.id;
        exitSuggestion(editor.view, recordRefPluginKey);
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "recordRef", attrs: { id: item.id, label, slug: item.slug } },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => {
        let popup: HTMLDivElement | null = null;
        let selectedIndex = 0;
        let currentProps: SuggestionProps<RecordItem> | null = null;

        const update = () => {
          if (!popup || !currentProps) return;
          renderRecordList(popup, currentProps.items, selectedIndex, (item) => {
            currentProps?.command(item);
          });
        };

        const position = () => {
          if (!popup || !currentProps?.clientRect) return;
          const rect = currentProps.clientRect();
          if (!rect) return;
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 6}px`;
        };

        let scrollHandler: (() => void) | null = null;

        return {
          onStart: (props: SuggestionProps<RecordItem>) => {
            selectedIndex = 0;
            currentProps = props;
            popup = createRecordPopup();
            document.body.appendChild(popup);
            update();
            position();
            scrollHandler = () => position();
            window.addEventListener("scroll", scrollHandler, true);

            if (props.items.length === 1 && props.items[0] === LOADING_SENTINEL) {
              loadAllRecords().then(() => {
                if (!currentProps || !popup) return;
                currentProps = { ...currentProps, items: filterRecords(currentProps.query ?? "") };
                update();
              });
            }
          },
          onUpdate: (props: SuggestionProps<RecordItem>) => {
            selectedIndex = 0;
            currentProps = props;
            update();
            position();
          },
           onKeyDown: ({ event, view }: { event: KeyboardEvent; view: EditorView }) => {
            if (!currentProps || !popup) return false;
            if (currentProps.items.length === 0 || (currentProps.items.length === 1 && currentProps.items[0] === LOADING_SENTINEL)) return false;
            if (event.isComposing || event.keyCode === 229) return false;
            if (event.key === "ArrowUp") {
              event.preventDefault();
              selectedIndex = (selectedIndex + currentProps.items.length - 1) % currentProps.items.length;
              update();
              return true;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              selectedIndex = (selectedIndex + 1) % currentProps.items.length;
              update();
              return true;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const item = currentProps.items[selectedIndex];
              if (item) currentProps.command(item);
              return true;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              exitSuggestion(view, recordRefPluginKey);
              return true;
            }
            return false;
          },
          onExit: () => {
            popup?.remove();
            popup = null;
            currentProps = null;
            if (scrollHandler) { window.removeEventListener("scroll", scrollHandler, true); scrollHandler = null; }
          },
        };
      },
    },
  });
}
