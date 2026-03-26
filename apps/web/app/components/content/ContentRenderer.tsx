import { useRef, useEffect } from "react";
import type { ContentFormat } from "../../lib/content/editor-extensions";
import { useMentionPreview, MentionPreviewCard } from "./MentionPreview";

const MENTION_LINK_SELECTOR = ".user-mention, .record-ref";

interface ContentRendererProps {
  contentHtml: string;
  format: ContentFormat;
  className?: string;
}

const NOTE_CLASS_NAME = "editor-content";

const ARTICLE_CLASS_NAME = "editor-content";

export function ContentRenderer({ contentHtml, format, className }: ContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { preview, open, pos, cardRef, onCardEnter, onCardLeave } = useMentionPreview(containerRef);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = contentHtml;
    }
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
