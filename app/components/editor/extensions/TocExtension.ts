import { Node, mergeAttributes } from "@tiptap/core";

export const TocExtension = Node.create({
  name: "toc",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: "nav[data-toc]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["nav", mergeAttributes({ class: "table-of-contents", "data-toc": "" }, HTMLAttributes), "목차"];
  },

  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.className = "toc-placeholder";
      dom.contentEditable = "false";
      dom.textContent = "📑 목차 (저장 후 헤딩 기반으로 자동 생성됩니다)";
      return { dom };
    };
  },
});
