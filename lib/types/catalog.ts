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

export type ProductSubcategory = {
  slug: string;
  categorySlug: string;
  name: string;
  description?: string;
  order?: number;
};

export type ProductVariant = {
  size: string;
  price: string;
  availabilityLabel: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  imageUrl?: string;
  catalogNumber: string;
  categorySlug: string;
  subcategorySlug?: string;
  chemicalName: string;
  alternativeName?: string;
  casNumber: string;
  molecularFormula: string;
  molecularWeight: string;
  purity: string;
  appearance: string;
  solubility?: string;
  shortDescription: string;
  detailedDescription: string;
  applications: string[];
  storageConditions: string;
  packSizes: string[];
  variants?: ProductVariant[];
  availability: ProductAvailability;
  coaAvailable: boolean;
  sdsAvailable: boolean;
  sdsUrl?: string;
  dslStatus?: string;
  tscaCertification?: string;
  rtecsNumber?: string;
  coaLotFormat?: string;
  shippingConditions?: string;
  tariffCode?: string;
  safetyStatement?: string;
  showSingleLotAvailability?: boolean;
};
