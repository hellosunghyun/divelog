import { Node, mergeAttributes } from "@tiptap/core";

export const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => (attributes.open ? { open: "" } : {}),
      },
      summary: {
        default: "클릭하여 펼치기",
        parseHTML: (element) => element.querySelector("summary")?.textContent ?? "클릭하여 펼치기",
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { summary, ...rest } = HTMLAttributes;
    return [
      "details",
      mergeAttributes({ class: "toggle-block" }, rest),
      ["summary", {}, summary ?? "클릭하여 펼치기"],
      ["div", { class: "toggle-content" }, 0],
    ];
  },
});
