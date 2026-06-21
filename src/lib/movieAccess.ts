const GMT5_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * UTC instant of 00:00 *today* in GMT+5. A movie whose `date` is before this
 * has rolled into "yesterday or earlier" in Tashkent time and is expired.
 */
export function activeMovieCutoff(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + GMT5_OFFSET_MS); // shift wall-clock to GMT+5
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  return new Date(Date.UTC(y, m, d) - GMT5_OFFSET_MS); // that local midnight, back in UTC
}