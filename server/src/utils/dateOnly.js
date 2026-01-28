/**
 * Normalize a value to a YYYY-MM-DD string (or null/undefined passthrough).
 *
 * - Date -> toISOString().slice(0, 10)
 * - "YYYY-MM-DD" -> as-is
 * - ISO datetime string -> slice(0, 10)
 */
export function toDateOnlyString(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    if (value === "") return value;
    // Accept ISO strings, e.g. 2026-01-27T15:00:00.000Z
    if (value.length >= 10) return value.slice(0, 10);
    return value;
  }

  return value;
}
