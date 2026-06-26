export function formatSessionDate(date: Date | string, locale = "en", opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(date).toLocaleDateString(locale, {
    timeZone: "Asia/Tashkent",
    year: "numeric", month: "long", day: "numeric", ...opts,
  });
}