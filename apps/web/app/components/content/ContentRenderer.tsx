import { useRef, useEffect } from "react";
import type { ContentFormat } from "../../lib/content/editor-extensions";
import { useMentionPreview, MentionPreviewCard } from "./MentionPreview";

const MENTION_LINK_SELECTOR = ".user-mention, .record-ref";

interface ContentRendererProps {
  contentHtml: string;
  format: ContentFormat;
  className?: string;
}

const NOTE_CLASS_NAME = [
  "break-words text-base leading-relaxed text-text-primary",
  "[&_div]:whitespace-pre-wrap",
  "[&_.user-mention]:text-ocean-blue [&_.user-mention]:no-underline [&_.user-mention]:font-medium [&_.user-mention]:hover:underline [&_.user-mention]:hover:underline-offset-4",
  "[&_.record-ref]:text-ocean-blue [&_.record-ref]:no-underline [&_.record-ref]:font-medium [&_.record-ref]:hover:underline [&_.record-ref]:hover:underline-offset-4",
].join(" ");

const ARTICLE_CLASS_NAME = [
  "break-words text-base leading-relaxed text-text-primary",
  "[&_p]:my-0 [&_p+*]:mt-5",
  "[&_h1]:mt-0 [&_h1]:mb-6 [&_h1]:text-4xl [&_h1]:leading-title [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mb-5 [&_h2]:text-3xl [&_h2]:leading-title [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2:not(:first-child)]:mt-8",
  "[&_h3]:mb-4 [&_h3]:text-2xl [&_h3]:leading-title [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3:not(:first-child)]:mt-7",
  "[&_h4]:text-xl [&_h4]:leading-title [&_h4]:font-semibold [&_h4]:tracking-tight [&_h4:not(:first-child)]:mt-6",
  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
  "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
  "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-reef-cyan [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary",
  "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-secondary [&_pre]:p-4",
  "[&_code]:rounded-lg [&_code]:bg-surface-secondary [&_code]:px-2 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a:not(.user-mention):not(.record-ref)]:text-ocean-blue [&_a:not(.user-mention):not(.record-ref)]:underline [&_a:not(.user-mention):not(.record-ref)]:underline-offset-4 [&_a:not(.user-mention):not(.record-ref)]:decoration-ocean-blue/30 [&_a:not(.user-mention):not(.record-ref)]:hover:decoration-ocean-blue",
  "[&_.user-mention]:text-ocean-blue [&_.user-mention]:no-underline [&_.user-mention]:font-medium [&_.user-mention]:hover:underline [&_.user-mention]:hover:underline-offset-4",
  "[&_.record-ref]:text-ocean-blue [&_.record-ref]:no-underline [&_.record-ref]:font-medium [&_.record-ref]:hover:underline [&_.record-ref]:hover:underline-offset-4",
  "[&_table]:my-6 [&_table]:w-full [&_table]:table-auto [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-border [&_table]:bg-surface",
  "[&_thead]:bg-surface-secondary/80",
  "[&_th]:border [&_th]:border-border [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:align-top [&_th]:text-sm [&_th]:font-semibold [&_th]:text-text-primary",
  "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-text-primary",
  "[&_tbody_tr:nth-child(even)]:bg-surface-secondary/30",
  "[&_img]:my-6 [&_img]:w-full [&_img]:rounded-md [&_img]:border [&_img]:border-border",
  "[&_hr]:my-8 [&_hr]:border-border",
].join(" ");

export function ContentRenderer({ contentHtml, format, className }: ContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { preview, open, pos, cardRef, onCardEnter, onCardLeave } = useMentionPreview(containerRef);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = contentHtml;

    container.querySelectorAll("table").forEach((table, index) => {
      const tableElement = table as HTMLTableElement;
      tableElement.style.width = "100%";
      tableElement.style.margin = "1.5rem 0";
      tableElement.style.borderCollapse = "collapse";
      tableElement.style.tableLayout = "auto";
      tableElement.style.background = "var(--color-surface, #FFFFFF)";
      tableElement.style.border = "1px solid var(--color-border, #E3E8EF)";

      tableElement.querySelectorAll("thead").forEach((thead) => {
        (thead as HTMLElement).style.background = "var(--color-surface-secondary, #F2F5F8)";
      });

      tableElement.querySelectorAll("th").forEach((headerCell) => {
        const cell = headerCell as HTMLTableCellElement;
        cell.style.padding = "0.75rem 1rem";
        cell.style.border = "1px solid var(--color-border, #E3E8EF)";
        cell.style.textAlign = "left";
        cell.style.verticalAlign = "top";
        cell.style.fontSize = "0.875rem";
        cell.style.fontWeight = "600";
      });

      tableElement.querySelectorAll("td").forEach((dataCell) => {
        const cell = dataCell as HTMLTableCellElement;
        cell.style.padding = "0.75rem 1rem";
        cell.style.border = "1px solid var(--color-border, #E3E8EF)";
        cell.style.verticalAlign = "top";
      });

      tableElement.querySelectorAll("tbody tr").forEach((row, rowIndex) => {
        if ((rowIndex + 1) % 2 === 0) {
          (row as HTMLElement).style.background = "rgba(242, 245, 248, 0.7)";
        }
      });

      if (index === 0) {
        tableElement.style.marginTop = "0";
      }
    });
  }, [contentHtml]);

  // Force full-page navigation for mention/record-ref links.
  // React Router intercepts <a> clicks for SPA navigation but mishandles
  // links inside dangerouslySetInnerHTML, causing route mismatch errors.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(MENTION_LINK_SELECTOR);
      if (!anchor || !container!.contains(anchor)) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.location.href = href;
      }
    }

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, []);

  const combinedClassName = [
    format === "note" ? NOTE_CLASS_NAME : ARTICLE_CLASS_NAME,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div ref={containerRef} className={combinedClassName} />
      <MentionPreviewCard
        preview={preview}
        open={open}
        pos={pos}
        cardRef={cardRef}
        onCardEnter={onCardEnter}
        onCardLeave={onCardLeave}
      />
    </>
  );
}
