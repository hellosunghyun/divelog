import { Mention } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import { disassemble, getChoseong } from "es-hangul";

interface MentionItem {
  id: string;
  slug: string;
  displayName: string;
  profilePhotoUrl: string | null;
}

const LOADING_SENTINEL: MentionItem = { id: "__loading__", slug: "", displayName: "", profilePhotoUrl: null };
const mentionPluginKey = new PluginKey("userMention");

let allLearners: MentionItem[] | null = null;
let loadPromise: Promise<MentionItem[]> | null = null;

function hangulIncludes(target: string, search: string): boolean {
  const dt = disassemble(target);
  const ds = disassemble(search);
  if (dt.includes(ds)) return true;
  const ct = getChoseong(target);
  if (ct.includes(search)) return true;
  return target.toLowerCase().includes(search.toLowerCase());
}

function loadAllLearners(): Promise<MentionItem[]> {
  if (allLearners !== null) return Promise.resolve(allLearners);
  if (loadPromise) return loadPromise;

  loadPromise = fetch("/api/search-learners?q=")
    .then((res) => (res.ok ? (res.json() as Promise<{ results: MentionItem[] }>) : { results: [] as MentionItem[] }))
    .then((data) => {
      allLearners = data.results ?? [];
      loadPromise = null;
      return allLearners;
    })
    .catch(() => {
      loadPromise = null;
      return [] as MentionItem[];
    });

  return loadPromise;
}

function filterLearners(query: string): MentionItem[] {
  if (!allLearners) return [LOADING_SENTINEL];
  if (!query) return allLearners;
  return allLearners.filter((item) => hangulIncludes(item.displayName, query));
}

function createMentionPopup() {
  const popup = document.createElement("div");
  popup.dataset.role = "mention-popup";
  popup.style.cssText = "position:fixed;z-index:60;min-width:220px;max-width:300px;padding:4px;border-radius:12px;border:1px solid var(--color-border);background:var(--color-surface);box-shadow:0 4px 20px -2px rgba(11,36,71,0.08)";
  return popup;
}

function renderMentionList(
  container: HTMLElement,
  items: MentionItem[],
  selectedIndex: number,
  onSelect: (item: MentionItem) => void,
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
    el.textContent = "러너를 찾을 수 없습니다";
    container.appendChild(el);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.style.cssText = `width:100%;display:flex;align-items:center;gap:10px;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;text-align:left;color:var(--color-text-primary);transition:background 150ms;background:${index === selectedIndex ? "var(--color-mist-blue)" : "transparent"}`;

    if (item.profilePhotoUrl) {
      const img = document.createElement("img");
      img.src = item.profilePhotoUrl;
      img.alt = "";
      img.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0";
      row.appendChild(img);
    } else {
      const avatar = document.createElement("div");
      avatar.style.cssText = "width:28px;height:28px;border-radius:50%;background:var(--color-mist-blue);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--color-ocean-blue);flex-shrink:0";
      avatar.textContent = item.displayName[0] ?? "?";
      row.appendChild(avatar);
    }

    const name = document.createElement("span");
    name.style.cssText = "font-size:14px;font-weight:500";
    name.textContent = item.displayName;
    row.appendChild(name);

    row.addEventListener("mouseenter", () => {
      container.querySelectorAll("button").forEach((btn, i) => {
        (btn as HTMLElement).style.background = i === index ? "var(--color-mist-blue)" : "transparent";
      });
    });
    row.addEventListener("mousedown", (e) => e.preventDefault());
    row.addEventListener("click", () => onSelect(item));
    container.appendChild(row);
  });
}

export function createUserMentionExtension() {
  loadAllLearners();

  return Mention.extend({ name: "userMention" }).configure({
    HTMLAttributes: { class: "user-mention" },
    suggestion: {
      char: "@",
      pluginKey: mentionPluginKey,
      allowedPrefixes: null,
      allow: ({ state }: { editor: any; state: any }) => {
        const parent = state.selection.$from.parent;
        return parent.isTextblock && !parent.type.spec.code;
      },
      items: ({ query }: { query: string }) => filterLearners(query),
      command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
        if (props.id === "__loading__") return;
        const label = props.displayName ?? props.label ?? props.id;
        const slug = props.slug ?? props.id;
        exitSuggestion(editor.view, mentionPluginKey);
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "userMention", attrs: { id: slug, label } },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => {
        let popup: HTMLDivElement | null = null;
        let selectedIndex = 0;
        let currentProps: SuggestionProps<MentionItem> | null = null;

        const update = () => {
          if (!popup || !currentProps) return;
          renderMentionList(popup, currentProps.items, selectedIndex, (item) => {
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
          onStart: (props: SuggestionProps<MentionItem>) => {
            selectedIndex = 0;
            currentProps = props;
            popup = createMentionPopup();
            document.body.appendChild(popup);
            update();
            position();
            scrollHandler = () => position();
            window.addEventListener("scroll", scrollHandler, true);

            if (props.items.length === 1 && props.items[0] === LOADING_SENTINEL) {
              loadAllLearners().then(() => {
                if (!currentProps || !popup) return;
                currentProps = { ...currentProps, items: filterLearners(currentProps.query ?? "") };
                update();
              });
            }
          },
          onUpdate: (props: SuggestionProps<MentionItem>) => {
            selectedIndex = 0;
            currentProps = props;
            update();
            position();
          },
          onKeyDown: ({ event, view }: { event: KeyboardEvent; view: any }) => {
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
              exitSuggestion(view, mentionPluginKey);
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
