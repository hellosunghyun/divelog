import { Mention } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";

interface MentionItem {
  id: string;
  slug: string;
  displayName: string;
  profilePhotoUrl: string | null;
}

const mentionPluginKey = new PluginKey("userMention");

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchLearners(query: string): Promise<MentionItem[]> {
  if (!query || query.length < 1) return [];

  if (debounceTimer) clearTimeout(debounceTimer);

  return new Promise((resolve) => {
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-learners?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          console.warn("[mention] search-learners 응답 오류:", res.status);
          resolve([]);
          return;
        }
        const data = (await res.json()) as { results: MentionItem[]; _auth?: boolean };
        if (data._auth === false) {
          console.warn("[mention] 인증되지 않은 상태에서 러너 검색 시도");
        }
        resolve(data.results ?? []);
      } catch (err) {
        console.warn("[mention] search-learners fetch 실패:", err);
        resolve([]);
      }
    }, 250);
  });
}

function createMentionPopup() {
  const popup = document.createElement("div");
  popup.dataset.role = "mention-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = "60";
  popup.style.minWidth = "220px";
  popup.style.maxWidth = "300px";
  popup.style.padding = "4px";
  popup.style.borderRadius = "12px";
  popup.style.border = "1px solid var(--color-border)";
  popup.style.background = "var(--color-surface)";
  popup.style.boxShadow = "0 4px 20px -2px rgba(11,36,71,0.08)";
  return popup;
}

function renderMentionList(
  container: HTMLElement,
  items: MentionItem[],
  selectedIndex: number,
  onSelect: (item: MentionItem) => void,
) {
  container.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.padding = "12px 16px";
    empty.style.fontSize = "13px";
    empty.style.color = "var(--color-text-tertiary)";
    empty.textContent = "러너를 찾을 수 없습니다";
    container.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.style.width = "100%";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.padding = "8px 12px";
    row.style.border = "none";
    row.style.borderRadius = "8px";
    row.style.cursor = "pointer";
    row.style.textAlign = "left";
    row.style.background = index === selectedIndex ? "var(--color-mist-blue)" : "transparent";
    row.style.color = "var(--color-text-primary)";
    row.style.transition = "background 150ms";

    if (item.profilePhotoUrl) {
      const img = document.createElement("img");
      img.src = item.profilePhotoUrl;
      img.alt = "";
      img.style.width = "28px";
      img.style.height = "28px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";
      img.style.flexShrink = "0";
      row.appendChild(img);
    } else {
      const avatar = document.createElement("div");
      avatar.style.width = "28px";
      avatar.style.height = "28px";
      avatar.style.borderRadius = "50%";
      avatar.style.background = "var(--color-mist-blue)";
      avatar.style.display = "flex";
      avatar.style.alignItems = "center";
      avatar.style.justifyContent = "center";
      avatar.style.fontSize = "12px";
      avatar.style.fontWeight = "600";
      avatar.style.color = "var(--color-ocean-blue)";
      avatar.style.flexShrink = "0";
      avatar.textContent = item.displayName[0] ?? "?";
      row.appendChild(avatar);
    }

    const name = document.createElement("span");
    name.style.fontSize = "14px";
    name.style.fontWeight = "500";
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
      items: async ({ query }: { query: string }) => fetchLearners(query),
      command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
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
          },
          onUpdate: (props: SuggestionProps<MentionItem>) => {
            selectedIndex = 0;
            currentProps = props;
            update();
            position();
          },
          onKeyDown: ({ event, view }: { event: KeyboardEvent; view: any }) => {
            if (!currentProps || !popup || currentProps.items.length === 0) return false;
            if (event.isComposing || event.keyCode === 229) {
              return false;
            }
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
