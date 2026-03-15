export const CONTENT_FORMATS = ["note", "article"] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export function normalizeContentFormat(format: string): ContentFormat {
  return format === "article" ? "article" : "note";
}
