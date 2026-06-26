/**
 * Midnight UTC of today's calendar date in Tashkent. Sessions whose `date`
 * (stored as midnight UTC) is before this cutoff have expired in Tashkent time.
 * The filter boundary flips at exactly 00:00 Tashkent (= 19:00 UTC prev day).
 */
export function activeMovieCutoff(now: Date = new Date()): Date {
  const todayTashkent = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
  }).format(now); // "YYYY-MM-DD"
  return new Date(`${todayTashkent}T00:00:00Z`);
}