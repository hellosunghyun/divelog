import { Image } from "@tiptap/extension-image";

const SIZE_OPTIONS = [
  { label: "소", width: "240px" },
  { label: "중", width: "400px" },
  { label: "대", width: "560px" },
  { label: "원본", width: "100%" },
];

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: "100%", parseHTML: (el) => el.style.width || el.getAttribute("width") || "100%", renderHTML: (attrs) => ({ style: `width: ${attrs.width}` }) },
      dataAlign: { default: "center", parseHTML: (el) => el.getAttribute("data-align") || "center", renderHTML: (attrs) => ({ "data-align": attrs.dataAlign }) },
      caption: { default: "", parseHTML: (el) => el.closest("figure")?.querySelector("figcaption")?.textContent ?? "", renderHTML: () => ({}) },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("figure");
      wrapper.className = "resizable-image-wrapper";
      wrapper.setAttribute("data-align", node.attrs.dataAlign || "center");

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || "";
      img.style.width = node.attrs.width || "100%";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "8px";
      img.style.display = "block";
      img.style.cursor = "pointer";
      img.draggable = false;

      let toolbar: HTMLDivElement | null = null;

      function removeTb() {
        if (toolbar) { toolbar.remove(); toolbar = null; }
      }

      function showToolbar() {
        removeTb();
        toolbar = document.createElement("div");
        toolbar.className = "image-size-toolbar";

        SIZE_OPTIONS.forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = opt.label;
          btn.className = "image-size-btn";
          if (img.style.width === opt.width) btn.classList.add("active");

          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
          });

          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pos = typeof getPos === "function" ? getPos() : undefined;
            if (pos === undefined) return;
            editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { width: opt.width }).run();
            img.style.width = opt.width;
            toolbar?.querySelectorAll(".image-size-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });

          toolbar!.appendChild(btn);
        });

        wrapper.insertBefore(toolbar, img);
      }

      img.addEventListener("click", (e) => {
        e.preventDefault();
        if (toolbar) { removeTb(); return; }
        showToolbar();
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos !== undefined) editor.commands.setNodeSelection(pos);
      });

      const handleClickOutside = (e: MouseEvent) => {
        if (!wrapper.contains(e.target as Node)) removeTb();
      };
      document.addEventListener("click", handleClickOutside);

      wrapper.appendChild(img);

      const captionInput = document.createElement("input");
      captionInput.type = "text";
      captionInput.className = "image-caption-input";
      captionInput.placeholder = "캡션 추가...";
      captionInput.value = node.attrs.caption || "";
      captionInput.addEventListener("blur", () => {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos !== undefined) {
          editor.chain().setNodeSelection(pos).updateAttributes("image", { caption: captionInput.value }).run();
        }
      });
      captionInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); captionInput.blur(); }
      });
      wrapper.appendChild(captionInput);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "image") return false;
          img.src = updatedNode.attrs.src;
          img.alt = updatedNode.attrs.alt || "";
          img.style.width = updatedNode.attrs.width || "100%";
          wrapper.setAttribute("data-align", updatedNode.attrs.dataAlign || "center");
          if (captionInput !== document.activeElement) {
            captionInput.value = updatedNode.attrs.caption || "";
          }
          return true;
        },
        destroy: () => {
          document.removeEventListener("click", handleClickOutside);
          removeTb();
        },
      };
    };
  },
});
