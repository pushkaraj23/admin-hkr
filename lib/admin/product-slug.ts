/** Derive Firestore doc id from catalog SKU (e.g. HKR-CARB-001 → hkr-carb-001). */
export function slugFromCatalogNumber(catalogNumber: string): string {
  return catalogNumber.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Internal product id stored on the document (e.g. hkr-carb-001 → prod-hkr-carb-001). */
export function productIdFromSlug(slug: string): string {
  const s = slug.trim();
  if (!s) return "";
  return s.startsWith("prod-") ? s : `prod-${s}`;
}
