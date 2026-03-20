export function parseDateToUnix(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return Math.floor(date.getTime() / 1000);
}
