import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey, EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
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
  category: string;
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
      category: "기본",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: "제목 2",
      description: "중간 크기 섹션 제목",
      icon: "H2",
      keywords: ["제목", "헤더", "h2"],
      category: "기본",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
      },
    },
    {
      title: "제목 3",
      description: "작은 섹션 제목",
      icon: "H3",
      keywords: ["제목", "헤더", "h3"],
      category: "기본",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
      },
    },
    {
      title: "글머리 기호",
      description: "순서 없는 목록",
      icon: "•",
      keywords: ["목록", "리스트", "bullet"],
      category: "목록",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "번호 매기기",
      description: "순서 있는 목록",
      icon: "1.",
      keywords: ["목록", "리스트", "번호", "ordered"],
      category: "목록",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "체크리스트",
      description: "할 일 체크 목록",
      icon: "☑",
      keywords: ["체크", "할일", "task", "todo", "checkbox"],
      category: "목록",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "이미지",
      description: "이미지를 업로드해 삽입",
      icon: "🖼",
      keywords: ["이미지", "사진", "image"],
      category: "미디어",
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
    {
      title: "표",
      description: "행과 열이 있는 표",
      icon: "⊞",
      keywords: ["표", "테이블", "table"],
      category: "미디어",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      title: "구분선",
      description: "문단 사이 구분 라인",
      icon: "―",
      keywords: ["선", "divider", "hr"],
      category: "미디어",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "인용구",
      description: "강조된 인용 블록",
      icon: "❝",
      keywords: ["인용", "quote", "blockquote"],
      category: "콜아웃",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "콜아웃",
      description: "강조하고 싶은 안내 블록",
      icon: "ℹ",
      keywords: ["콜아웃", "안내", "callout", "info", "알림"],
      category: "콜아웃",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        editor.chain().focus().wrapIn("callout", { type: "info" }).run();
      },
    },
    {
      title: "팁",
      description: "유용한 팁이나 노하우",
      icon: "💡",
      keywords: ["팁", "tip", "노하우"],
      category: "콜아웃",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        editor.chain().focus().wrapIn("callout", { type: "tip" }).run();
      },
    },
    {
      title: "주의",
      description: "주의가 필요한 내용",
      icon: "⚠",
      keywords: ["주의", "경고", "warning"],
      category: "콜아웃",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        editor.chain().focus().wrapIn("callout", { type: "warning" }).run();
      },
    },
    {
      title: "질문 블록",
      description: "아직 답이 없는 질문을 남기기",
      icon: "?",
      keywords: ["질문", "question", "궁금"],
      category: "콜아웃",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        editor.chain().focus().wrapIn("callout", { type: "question" }).run();
      },
    },
    {
      title: "접기",
      description: "펼쳐서 볼 수 있는 접힌 블록",
      icon: "▸",
      keywords: ["접기", "토글", "toggle", "details", "펼치기"],
      category: "콜아웃",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        editor.chain().focus().wrapIn("toggleBlock").run();
      },
    },
    {
      title: "형광펜",
      description: "텍스트를 형광 표시",
      icon: "🖍",
      keywords: ["형광", "강조", "highlight", "마크"],
      category: "꾸미기",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleHighlight().run();
      },
    },
    {
      title: "코드 블록",
      description: "문법 강조 코드 영역",
      icon: "</>",
      keywords: ["코드", "code", "snippet"],
      category: "꾸미기",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "목차",
      description: "헤딩 기반 자동 목차",
      icon: "📑",
      keywords: ["목차", "toc", "table of contents", "차례"],
      category: "꾸미기",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent({ type: "toc" }).run();
      },
    },
    {
      title: "빨강 텍스트",
      description: "텍스트를 빨간색으로",
      icon: "🔴",
      keywords: ["빨강", "red", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#DC2626").run(); },
    },
    {
      title: "주황 텍스트",
      description: "텍스트를 주황색으로",
      icon: "🟠",
      keywords: ["주황", "orange", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#EA580C").run(); },
    },
    {
      title: "노랑 텍스트",
      description: "텍스트를 노란색으로",
      icon: "🟡",
      keywords: ["노랑", "yellow", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#CA8A04").run(); },
    },
    {
      title: "초록 텍스트",
      description: "텍스트를 초록색으로",
      icon: "🟢",
      keywords: ["초록", "green", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#16A34A").run(); },
    },
    {
      title: "파랑 텍스트",
      description: "텍스트를 파란색으로",
      icon: "🔵",
      keywords: ["파랑", "blue", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#146C94").run(); },
    },
    {
      title: "보라 텍스트",
      description: "텍스트를 보라색으로",
      icon: "🟣",
      keywords: ["보라", "purple", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#7C3AED").run(); },
    },
    {
      title: "분홍 텍스트",
      description: "텍스트를 분홍색으로",
      icon: "💗",
      keywords: ["분홍", "pink", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#DB2777").run(); },
    },
    {
      title: "갈색 텍스트",
      description: "텍스트를 갈색으로",
      icon: "🟤",
      keywords: ["갈색", "brown", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#92400E").run(); },
    },
    {
      title: "회색 텍스트",
      description: "텍스트를 회색으로",
      icon: "⚪",
      keywords: ["회색", "gray", "grey", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setColor("#6B7280").run(); },
    },
    {
      title: "색상 초기화",
      description: "텍스트 색상을 기본으로 되돌리기",
      icon: "✖",
      keywords: ["초기화", "reset", "기본", "색상", "color"],
      category: "색상",
      command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).unsetColor().run(); },
    },
  ];
}

function filterItems(items: SlashCommandItem[], query: string) {
  const normalized = query.trim().toLowerCase();

  return items.filter((item) => {
    if (item.category === "색상" && !normalized) return false;
    if (!normalized) return true;
    const candidates = [item.title, item.description, item.category, ...item.keywords];
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
          allow: ({ editor, state }: { editor: Editor; state: EditorState }) => {
            const parent = state.selection.$from.parent;
            return !editor.view.composing && parent.isTextblock && !parent.type.spec.code;
          },
          items: ({ query }) => filterItems(getSlashItems(options), query).slice(0, 30),
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

              const grouped = new Map<string, SlashCommandItem[]>();
              for (const item of currentProps.items) {
                const cat = item.category;
                if (!grouped.has(cat)) grouped.set(cat, []);
                grouped.get(cat)!.push(item);
              }

              let buttonIndex = 0;

              for (const [category, categoryItems] of grouped) {
                const header = document.createElement("li");
                header.style.listStyle = "none";
                header.style.padding = "6px 8px 2px";
                header.style.fontSize = "11px";
                header.style.fontWeight = "600";
                header.style.color = "#8C8C91";
                header.style.textTransform = "uppercase";
                header.style.letterSpacing = "0.05em";
                header.textContent = category;
                list.appendChild(header);

                for (const item of categoryItems) {
                  const index = buttonIndex;
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
                  buttonIndex++;
                }
              }

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
               onKeyDown: ({ event, view }: { event: KeyboardEvent; view: EditorView }) => {
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
