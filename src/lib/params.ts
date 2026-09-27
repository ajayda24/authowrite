/** Route params may arrive percent-encoded (e.g. non-Latin slugs). */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
