import { Mention } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import type { SuggestionProps } from "@tiptap/suggestion";

interface RecordItem {
  id: string;
  slug: string;
  title: string;
  format: string;
  authorDisplayName: string | null;
}

const recordRefPluginKey = new PluginKey("recordRef");

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchRecords(query: string): Promise<RecordItem[]> {
  if (!query || query.length < 1) return [];

  return new Promise((resolve) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-records?q=${encodeURIComponent(query)}`);
        if (!res.ok) { resolve([]); return; }
        const data = (await res.json()) as { results: RecordItem[] };
        resolve(data.results ?? []);
      } catch {
        resolve([]);
      }
    }, 250);
  });
}

function createRecordPopup() {
  const popup = document.createElement("div");
  popup.dataset.role = "record-ref-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = "60";
  popup.style.minWidth = "260px";
  popup.style.maxWidth = "360px";
  popup.style.padding = "4px";
  popup.style.borderRadius = "12px";
  popup.style.border = "1px solid var(--color-border)";
  popup.style.background = "var(--color-surface)";
  popup.style.boxShadow = "0 4px 20px -2px rgba(11,36,71,0.08)";
  return popup;
}

function renderRecordList(
  container: HTMLElement,
  items: RecordItem[],
  selectedIndex: number,
  onSelect: (item: RecordItem) => void,
) {
  container.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.padding = "12px 16px";
    empty.style.fontSize = "13px";
    empty.style.color = "var(--color-text-tertiary)";
    empty.textContent = "기록을 찾을 수 없습니다";
    container.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.style.width = "100%";
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "2px";
    row.style.padding = "8px 12px";
    row.style.border = "none";
    row.style.borderRadius = "8px";
    row.style.cursor = "pointer";
    row.style.textAlign = "left";
    row.style.background = index === selectedIndex ? "var(--color-surface-secondary)" : "transparent";
    row.style.color = "var(--color-text-primary)";
    row.style.transition = "background 150ms";

    const title = document.createElement("span");
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.3";
    title.textContent = item.title;
    row.appendChild(title);

    const meta = document.createElement("span");
    meta.style.fontSize = "12px";
    meta.style.color = "var(--color-text-tertiary)";
    meta.style.lineHeight = "1.3";
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
  return Mention.extend({ name: "recordRef" }).configure({
    HTMLAttributes: { class: "record-ref" },
    suggestion: {
      char: "[[",
      pluginKey: recordRefPluginKey,
      allowedPrefixes: null,
      items: async ({ query }: { query: string }) => fetchRecords(query),
      command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
        const label = props.title ?? props.label ?? props.id;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "recordRef", attrs: { id: props.id, label, slug: props.slug } },
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
          },
          onUpdate: (props: SuggestionProps<RecordItem>) => {
            selectedIndex = 0;
            currentProps = props;
            update();
            position();
          },
          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (!currentProps || !popup || currentProps.items.length === 0) return false;
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
              popup?.remove();
              popup = null;
              if (scrollHandler) { window.removeEventListener("scroll", scrollHandler, true); scrollHandler = null; }
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
