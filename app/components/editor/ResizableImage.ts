import { Image } from "@tiptap/extension-image";

const SIZE_OPTIONS = [
  { label: "S", width: "25%" },
  { label: "M", width: "50%" },
  { label: "L", width: "75%" },
  { label: "원본", width: "100%" },
];

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: "100%", parseHTML: (el) => el.style.width || el.getAttribute("width") || "100%", renderHTML: (attrs) => ({ style: `width: ${attrs.width}` }) },
      dataAlign: { default: "center", parseHTML: (el) => el.getAttribute("data-align") || "center", renderHTML: (attrs) => ({ "data-align": attrs.dataAlign }) },
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

        const alignBtns = [
          { label: "←", value: "left" },
          { label: "↔", value: "center" },
          { label: "→", value: "right" },
        ];

        const sep = document.createElement("span");
        sep.className = "image-toolbar-sep";
        toolbar.appendChild(sep);

        alignBtns.forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = opt.label;
          btn.className = "image-size-btn";
          if ((node.attrs.dataAlign || "center") === opt.value) btn.classList.add("active");

          btn.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pos = typeof getPos === "function" ? getPos() : undefined;
            if (pos === undefined) return;
            editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { dataAlign: opt.value }).run();
            wrapper.setAttribute("data-align", opt.value);
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

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "image") return false;
          img.src = updatedNode.attrs.src;
          img.alt = updatedNode.attrs.alt || "";
          img.style.width = updatedNode.attrs.width || "100%";
          wrapper.setAttribute("data-align", updatedNode.attrs.dataAlign || "center");
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
