/** "2026-11-12" -> "Thursday 12 November 2026". Built from parts so the time zone can't shift the day. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
