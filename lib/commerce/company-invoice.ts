const DEFAULT_STORE_SITE = "https://www.hkrbio.tech";

/** Public storefront URL (for logo asset on invoices). */
export function getStoreSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_STORE_SITE_URL?.trim() || DEFAULT_STORE_SITE;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getBrandLogoUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim();
  if (explicit) return explicit;
  return `${getStoreSiteUrl()}/hkr_logo.png`;
}

/** Company details shown on customer invoices (PDF). */
export const COMPANY_INVOICE = {
  legalName: "HKR Biotech Pvt. Ltd.",
  brandName: "HKR Biotech Labs",
  tagline: "Custom glycans · Protected sugars · Research chemicals",
  address: "HKR Biotech Pvt. Ltd., NCL Innovation Park, Pashan Road, Pune - 411008",
  email: "sales@hkrbiotechlabs.com",
  phone: "+91 8446660179",
  website: getStoreSiteUrl(),
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN?.trim() || "",
  pan: process.env.NEXT_PUBLIC_COMPANY_PAN?.trim() || "",
} as const;

export const INVOICE_FOOTER_NOTES = [
  "This is a computer-generated tax invoice for your confirmed online payment.",
  "Products are for research use only unless otherwise agreed in writing.",
  "For billing queries, contact sales@hkrbiotechlabs.com with your order reference.",
] as const;
