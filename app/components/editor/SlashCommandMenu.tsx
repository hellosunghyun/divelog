import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion, type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";

const slashCommandPluginKey = new PluginKey("slashCommand");

interface SlashCommandContext {
  editor: Editor;
  range: Range;
  uploadImage?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
}

interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (context: SlashCommandContext) => Promise<void> | void;
}

interface SlashCommandMenuOptions {
  uploadImage?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, "editor">;
}

function createMenuContainer() {
  const menu = document.createElement("div");
  menu.dataset.role = "slash-menu";
  menu.style.position = "fixed";
  menu.style.zIndex = "60";
  menu.style.minWidth = "280px";
  menu.style.maxWidth = "320px";
  menu.style.padding = "6px";
  menu.style.borderRadius = "4px";
  menu.style.border = "1px solid #E3E8EF";
  menu.style.background = "#FFFFFF";
  menu.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  return menu;
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/gif,image/jpeg,image/png,image/webp";
    input.style.display = "none";

    const finalize = (file: File | null) => {
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => {
      const file = input.files?.item(0) ?? null;
      finalize(file);
    });

    input.addEventListener("cancel", () => {
      finalize(null);
    });

    document.body.appendChild(input);
    input.click();
  });
}

function getSlashItems(options: Pick<SlashCommandMenuOptions, "uploadImage" | "onError">): SlashCommandItem[] {
  return [
    {
      title: "제목 1",
      description: "가장 큰 섹션 제목",
      icon: "H1",
      keywords: ["제목", "헤더", "h1"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: "제목 2",
      description: "중간 크기 섹션 제목",
      icon: "H2",
      keywords: ["제목", "헤더", "h2"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
      },
    },
    {
      title: "제목 3",
      description: "작은 섹션 제목",
      icon: "H3",
      keywords: ["제목", "헤더", "h3"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
      },
    },
    {
      title: "글머리 기호",
      description: "순서 없는 목록",
      icon: "•",
      keywords: ["목록", "리스트", "bullet"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "번호 매기기",
      description: "순서 있는 목록",
      icon: "1.",
      keywords: ["목록", "리스트", "번호", "ordered"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "인용구",
      description: "강조된 인용 블록",
      icon: "❝",
      keywords: ["인용", "quote", "blockquote"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "구분선",
      description: "문단 사이 구분 라인",
      icon: "―",
      keywords: ["선", "divider", "hr"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "코드 블록",
      description: "문법 강조 코드 영역",
      icon: "</>",
      keywords: ["코드", "code", "snippet"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "이미지",
      description: "이미지를 업로드해 삽입",
      icon: "🖼",
      keywords: ["이미지", "사진", "image"],
      command: async ({ editor, range }) => {
        if (!options.uploadImage) {
          options.onError?.("이미지 업로드 기능을 사용할 수 없습니다.");
          return;
        }

        const file = await pickImageFile();
        if (!file) {
          return;
        }

        try {
          const src = await options.uploadImage(file);
          editor.chain().focus().deleteRange(range).setImage({ src, alt: file.name }).run();
        } catch (error) {
          const message = error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
          options.onError?.(message);
        }
      },
    },
  ];
}

function filterItems(items: SlashCommandItem[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const candidates = [item.title, item.description, ...item.keywords];
    return candidates.some((candidate) => candidate.toLowerCase().includes(normalized));
  });
}

export function createSlashCommandExtension(
  options: Pick<SlashCommandMenuOptions, "uploadImage" | "onError">,
) {
  return Extension.create<SlashCommandMenuOptions>({
    name: "slashCommand",

    addOptions() {
      return {
        uploadImage: options.uploadImage,
        onError: options.onError,
        suggestion: {
          char: "/",
          pluginKey: slashCommandPluginKey,
          allow: ({ editor, state }: { editor: any; state: any }) => {
            const parent = state.selection.$from.parent;
            return !editor.view.composing && parent.isTextblock && !parent.type.spec.code;
          },
          items: ({ query }) => filterItems(getSlashItems(options), query).slice(0, 9),
          command: ({ editor, range, props }) => {
            exitSuggestion(editor.view, slashCommandPluginKey);
            void props.command({
              editor,
              range,
              uploadImage: options.uploadImage,
              onError: options.onError,
            });
          },
          render: () => {
            let menu: HTMLDivElement | null = null;
            let buttons: HTMLButtonElement[] = [];
            let selectedIndex = 0;
            let currentProps: SuggestionProps<SlashCommandItem> | null = null;
            let scrollHandler: (() => void) | null = null;

            const highlightSelected = () => {
              buttons.forEach((btn, i) => {
                btn.style.background = i === selectedIndex ? "#F2F5F8" : "transparent";
              });
            };

            const buildList = () => {
              if (!menu || !currentProps) return;

              menu.innerHTML = "";
              buttons = [];

              const list = document.createElement("ul");
              list.style.margin = "0";
              list.style.padding = "0";
              list.style.maxHeight = "340px";
              list.style.overflowY = "auto";

              if (currentProps.items.length === 0) {
                const empty = document.createElement("li");
                empty.style.listStyle = "none";
                empty.style.padding = "12px";
                empty.style.fontSize = "13px";
                empty.style.color = "#8C8C91";
                empty.textContent = "결과가 없습니다";
                list.appendChild(empty);
                menu.appendChild(list);
                return;
              }

              currentProps.items.forEach((item, index) => {
                const entry = document.createElement("li");
                entry.style.listStyle = "none";

                const button = document.createElement("button");
                button.type = "button";
                button.style.width = "100%";
                button.style.border = "none";
                button.style.borderRadius = "4px";
                button.style.padding = "8px";
                button.style.display = "grid";
                button.style.gridTemplateColumns = "30px 1fr";
                button.style.alignItems = "start";
                button.style.gap = "8px";
                button.style.cursor = "pointer";
                button.style.textAlign = "left";
                button.style.background = index === selectedIndex ? "#F2F5F8" : "transparent";
                button.style.color = "#1D1D1F";
                button.style.transition = "background 80ms";

                const icon = document.createElement("span");
                icon.textContent = item.icon;
                icon.style.display = "inline-flex";
                icon.style.justifyContent = "center";
                icon.style.alignItems = "center";
                icon.style.fontSize = "12px";
                icon.style.fontWeight = "600";

                const textGroup = document.createElement("span");
                textGroup.style.display = "grid";
                textGroup.style.gap = "2px";

                const title = document.createElement("span");
                title.textContent = item.title;
                title.style.fontSize = "14px";
                title.style.fontWeight = "600";
                title.style.lineHeight = "1.3";

                const description = document.createElement("span");
                description.textContent = item.description;
                description.style.fontSize = "12px";
                description.style.color = "#6E6E73";
                description.style.lineHeight = "1.3";

                textGroup.appendChild(title);
                textGroup.appendChild(description);
                button.appendChild(icon);
                button.appendChild(textGroup);

                button.addEventListener("mouseenter", () => {
                  selectedIndex = index;
                  highlightSelected();
                });

                button.addEventListener("mousedown", (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                });

                button.addEventListener("click", (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (currentProps) {
                    const capturedProps = currentProps;
                    const capturedItem = item;
                    requestAnimationFrame(() => {
                      capturedProps.command(capturedItem);
                    });
                  }
                });

                entry.appendChild(button);
                list.appendChild(entry);
                buttons.push(button);
              });

              menu.appendChild(list);
            };

            const updatePosition = () => {
              if (!menu || !currentProps?.clientRect) return;
              const rect = currentProps.clientRect();
              if (!rect) return;
              menu.style.left = `${rect.left}px`;
              menu.style.top = `${rect.bottom + 8}px`;
            };

            const attachScrollListener = () => {
              scrollHandler = () => updatePosition();
              window.addEventListener("scroll", scrollHandler, true);
            };

            const detachScrollListener = () => {
              if (scrollHandler) {
                window.removeEventListener("scroll", scrollHandler, true);
                scrollHandler = null;
              }
            };

            return {
              onStart: (props: SuggestionProps<SlashCommandItem>) => {
                selectedIndex = 0;
                currentProps = props;
                menu = createMenuContainer();
                document.body.appendChild(menu);
                buildList();
                updatePosition();
                attachScrollListener();
              },
              onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
                selectedIndex = 0;
                currentProps = props;
                buildList();
                updatePosition();
              },
              onKeyDown: ({ event, view }: { event: KeyboardEvent; view: any }) => {
                if (!currentProps || !menu || currentProps.items.length === 0) {
                  return false;
                }

                if (event.isComposing || event.keyCode === 229) {
                  exitSuggestion(view, slashCommandPluginKey);
                  return false;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  selectedIndex =
                    (selectedIndex + currentProps.items.length - 1) % currentProps.items.length;
                  highlightSelected();
                  buttons[selectedIndex]?.scrollIntoView({ block: "nearest" });
                  return true;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  selectedIndex = (selectedIndex + 1) % currentProps.items.length;
                  highlightSelected();
                  buttons[selectedIndex]?.scrollIntoView({ block: "nearest" });
                  return true;
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  const selectedItem = currentProps.items[selectedIndex];
                  if (selectedItem) {
                    currentProps.command(selectedItem);
                  }
                  return true;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  exitSuggestion(view, slashCommandPluginKey);
                  return true;
                }

                return false;
              },
              onExit: () => {
                menu?.remove();
                menu = null;
                buttons = [];
                currentProps = null;
                detachScrollListener();
              },
            };
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
    },
  });
}
