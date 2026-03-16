const TITLE_MAX_LENGTH = 30;

const MARKDOWN_EXTRACT = [
  [/\*\*(.+?)\*\*/g, "$1"],
  [/__(.+?)__/g, "$1"],
  [/\*(.+?)\*/g, "$1"],
  [/_(.+?)_/g, "$1"],
  [/~~(.+?)~~/g, "$1"],
  [/`(.+?)`/g, "$1"],
] as const;

const MARKDOWN_STRIP = [
  /^#+\s*/gm,
  /^>\s*/gm,
  /^[-*+]\s+/gm,
  /^\d+\.\s+/gm,
] as const;

export function generateNoteTitle(content: string): string {
  if (!content) return "메모";

  let text = content;

  for (const [pattern, replacement] of MARKDOWN_EXTRACT) {
    text = text.replace(pattern, replacement);
  }

  for (const pattern of MARKDOWN_STRIP) {
    text = text.replace(pattern, "");
  }

  text = text.replace(/\n+/g, " ").trim();

  if (!text) return "메모";

  if (text.length <= TITLE_MAX_LENGTH) return text;

  return text.slice(0, TITLE_MAX_LENGTH) + "…";
}
