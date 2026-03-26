import { useEffect, useRef, useState } from "react";
import type { ContentFormat } from "../../lib/content/editor-extensions";
import { useMentionPreview, MentionPreviewCard } from "./MentionPreview";
import { renderStoredArticleHtml } from "~/lib/content/render-content.client";

const MENTION_LINK_SELECTOR = ".user-mention, .record-ref";
const REPLACEMENT_CHARACTER = "�";

type CleanArticlePayload = {
  title?: string;
  content: string;
  contentHtml: string;
};

interface ContentRendererProps {
  contentHtml: string;
  content?: string;
  format: ContentFormat;
  className?: string;
  fallbackContentUrl?: string;
}

const NOTE_CLASS_NAME = "editor-content";

const ARTICLE_CLASS_NAME = "editor-content";

function hasReplacementCharacter(value: string | undefined): boolean {
  return typeof value === "string" && value.includes(REPLACEMENT_CHARACTER);
}

function resolveRenderedHtml({
  content,
  contentHtml,
  format,
}: {
  content?: string;
  contentHtml: string;
  format: ContentFormat;
}): string {
  if (!hasReplacementCharacter(contentHtml)) {
    return contentHtml;
  }

  if (
    format === "article"
    && typeof content === "string"
    && content.length > 0
  ) {
    const clientHtml = renderStoredArticleHtml(content);
    if (!hasReplacementCharacter(clientHtml)) {
      return clientHtml;
    }
  }

  return contentHtml;
}

function isCleanArticlePayload(value: unknown): value is CleanArticlePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.content === "string" && typeof candidate.contentHtml === "string";
}

async function fetchCleanArticlePayload(url: string): Promise<CleanArticlePayload | null> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const payload: unknown = await response.json();
      return isCleanArticlePayload(payload) ? payload : null;
    })
    .catch(() => null);
}

export function ContentRenderer({
  contentHtml,
  content,
  format,
  className,
  fallbackContentUrl,
}: ContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackAttemptedRef = useRef<string | null>(null);
  const [cleanArticlePayload, setCleanArticlePayload] = useState<CleanArticlePayload | null>(null);
  const { preview, open, pos, cardRef, onCardEnter, onCardLeave } = useMentionPreview(containerRef);

  const activeContentHtml = cleanArticlePayload?.contentHtml ?? contentHtml;
  const activeContent = cleanArticlePayload?.content ?? content;
  const displayHtml = resolveRenderedHtml({
    content: activeContent,
    contentHtml: activeContentHtml,
    format,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.querySelectorAll("p").forEach((paragraph) => {
      const hasVisibleContent = Array.from(paragraph.childNodes).some((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return (node.textContent?.trim().length ?? 0) > 0;
        }

        return node.nodeType === Node.ELEMENT_NODE;
      });

      if (!hasVisibleContent) {
        paragraph.innerHTML = "<br>";
      }
    });

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

    const shouldFetchCleanPayload =
      format === "article"
      && typeof fallbackContentUrl === "string"
      && fallbackContentUrl.length > 0
      && !cleanArticlePayload
      && fallbackAttemptedRef.current !== fallbackContentUrl
      && (
        hasReplacementCharacter(contentHtml)
        || hasReplacementCharacter(content)
        || hasReplacementCharacter(container.textContent ?? undefined)
      );

    if (!shouldFetchCleanPayload) {
      return;
    }

    fallbackAttemptedRef.current = fallbackContentUrl;

    let cancelled = false;

    void fetchCleanArticlePayload(fallbackContentUrl).then((payload) => {
      if (cancelled || !payload) {
        return;
      }

      const cleanHtml = resolveRenderedHtml({
        content: payload.content,
        contentHtml: payload.contentHtml,
        format,
      });

      if (hasReplacementCharacter(cleanHtml)) {
        return;
      }

      setCleanArticlePayload(payload);
    });

    return () => {
      cancelled = true;
    };
  }, [cleanArticlePayload, content, contentHtml, fallbackContentUrl, format]);

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
      <div
        ref={containerRef}
        className={combinedClassName}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
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
