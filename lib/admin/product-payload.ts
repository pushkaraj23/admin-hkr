import type { ProductVariant } from "@/lib/types/catalog";

const AVAIL = ["In stock", "Made to order", "Limited lots", "Quote required"] as const;

export function parseVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const rows: ProductVariant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const size = String(row.size ?? "").trim();
    if (!size) continue;
    rows.push({
      size,
      price: String(row.price ?? "").trim(),
      availabilityLabel: String(row.availabilityLabel ?? "").trim(),
    });
  }
  return rows;
}

export function productPayloadFromBody(body: Record<string, unknown>, slug: string) {
  const availabilityRaw = String(body.availability ?? "Quote required");
  const availability = AVAIL.includes(availabilityRaw as (typeof AVAIL)[number])
    ? availabilityRaw
    : "Quote required";

  const variants = parseVariants(body.variants);

  return {
    id: String(body.id ?? slug),
    slug,
    imageUrl: body.imageUrl ? String(body.imageUrl) : "",
    catalogNumber: String(body.catalogNumber ?? ""),
    categorySlug: String(body.categorySlug ?? ""),
    subcategorySlug: body.subcategorySlug ? String(body.subcategorySlug) : "",
    chemicalName: String(body.chemicalName ?? ""),
    alternativeName: body.alternativeName ? String(body.alternativeName) : "",
    casNumber: String(body.casNumber ?? ""),
    molecularFormula: String(body.molecularFormula ?? ""),
    molecularWeight: String(body.molecularWeight ?? ""),
    purity: String(body.purity ?? ""),
    appearance: String(body.appearance ?? ""),
    solubility: body.solubility ? String(body.solubility) : "",
    shortDescription: String(body.shortDescription ?? ""),
    detailedDescription: String(body.detailedDescription ?? ""),
    applications: Array.isArray(body.applications) ? body.applications.map(String) : [],
    storageConditions: String(body.storageConditions ?? ""),
    packSizes: Array.isArray(body.packSizes) ? body.packSizes.map(String) : [],
    variants,
    availability,
    coaAvailable: Boolean(body.coaAvailable),
    sdsAvailable: Boolean(body.sdsAvailable),
    sdsUrl: body.sdsUrl ? String(body.sdsUrl) : "",
    dslStatus: body.dslStatus ? String(body.dslStatus) : "",
    tscaCertification: body.tscaCertification ? String(body.tscaCertification) : "",
    rtecsNumber: body.rtecsNumber ? String(body.rtecsNumber) : "",
    coaLotFormat: body.coaLotFormat ? String(body.coaLotFormat) : "",
    shippingConditions: body.shippingConditions ? String(body.shippingConditions) : "",
    tariffCode: body.tariffCode ? String(body.tariffCode) : "",
    safetyStatement: body.safetyStatement ? String(body.safetyStatement) : "",
    showSingleLotAvailability: Boolean(body.showSingleLotAvailability),
  };
}
