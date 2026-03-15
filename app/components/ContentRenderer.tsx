import type { ContentFormat } from "../lib/editor-extensions";

interface ContentRendererProps {
  contentHtml: string;
  format: ContentFormat;
  className?: string;
}

const NOTE_CLASS_NAME = [
  "break-words text-base leading-relaxed text-text-primary",
  "[&_div]:whitespace-pre-wrap",
].join(" ");

const ARTICLE_CLASS_NAME = [
  "break-words text-base leading-relaxed text-text-primary",
  "[&_p]:my-0 [&_p+*]:mt-5",
  "[&_h1]:mt-0 [&_h1]:text-4xl [&_h1]:leading-title [&_h1]:font-semibold",
  "[&_h2]:text-3xl [&_h2]:leading-title [&_h2]:font-semibold [&_h2:not(:first-child)]:mt-8",
  "[&_h3]:text-2xl [&_h3]:leading-title [&_h3]:font-semibold [&_h3:not(:first-child)]:mt-7",
  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
  "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-ocean-blue [&_blockquote]:bg-mist-blue [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-text-secondary",
  "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-sm [&_pre]:bg-surface-secondary [&_pre]:p-4",
  "[&_code]:rounded-xs [&_code]:bg-surface-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:text-ocean-blue [&_a]:underline [&_a]:underline-offset-4",
  "[&_img]:my-6 [&_img]:w-full [&_img]:rounded-md [&_img]:border [&_img]:border-border",
  "[&_hr]:my-8 [&_hr]:border-border",
].join(" ");

export function ContentRenderer({ contentHtml, format, className }: ContentRendererProps) {
  const combinedClassName = [
    format === "note" ? NOTE_CLASS_NAME : ARTICLE_CLASS_NAME,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const containerProps = {
    className: combinedClassName,
    dangerouslySetInnerHTML: { __html: contentHtml },
  };

  return <div {...containerProps} />;
}
