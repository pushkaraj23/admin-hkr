/** Mirrors website catalogue types for admin forms and API payloads. */

export type ProductAvailability =
  | "In stock"
  | "Made to order"
  | "Limited lots"
  | "Quote required";

export type ProductCategory = {
  slug: string;
  name: string;
  imageUrl?: string;
  tagline: string;
  description: string;
  overview: string;
  highlights: string[];
  order?: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  imageUrl?: string;
  catalogNumber: string;
  categorySlug: string;
  chemicalName: string;
  casNumber: string;
  molecularFormula: string;
  molecularWeight: string;
  purity: string;
  appearance: string;
  shortDescription: string;
  detailedDescription: string;
  applications: string[];
  storageConditions: string;
  packSizes: string[];
  availability: ProductAvailability;
  datasheetUrl?: string;
  coaAvailable: boolean;
  sdsAvailable: boolean;
  relatedSlugs: string[];
};
