/** URL-safe slug from a display name (e.g. "API Impurities" → "api-impurities"). */
export function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
