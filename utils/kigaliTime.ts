/** Kigali wall-clock date/time strings for the API (Rwanda is UTC+2 all year, no DST). */
export function kigaliParts(date: Date) {
  const k = new Date(date.getTime() + 2 * 3_600_000).toISOString();
  return { scheduledDate: k.slice(0, 10), scheduledTime: k.slice(11, 16) };
}
