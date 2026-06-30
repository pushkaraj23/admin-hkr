"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductExtendedFields } from "@/components/admin/ProductExtendedFields";
import { CatalogImageField } from "@/components/admin/CatalogImageField";
import { DetailGrid, DetailImageItem, DetailItem } from "@/components/admin/DetailGrid";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import { parseBoolean, parseCsv, splitMulti } from "@/lib/admin/csv";
import type { CatalogProduct, ProductAvailability, ProductVariant } from "@/lib/types/catalog";

type ProductRow = CatalogProduct & Record<string, unknown>;
type CatRow = { slug: string; name: string };
type SubRow = { slug: string; name: string; categorySlug: string };

const AVAIL: ProductAvailability[] = ["In stock", "Made to order", "Limited lots", "Quote required"];

const PRODUCT_SAMPLE_CSV = [
  [
    "catalogNumber",
    "categorySlug",
    "subcategorySlug",
    "chemicalName",
    "alternativeName",
    "casNumber",
    "molecularFormula",
    "molecularWeight",
    "purity",
    "appearance",
    "solubility",
    "shortDescription",
    "detailedDescription",
    "applications",
    "storageConditions",
    "packSizes",
    "variantSizes",
    "variantPrices",
    "variantAvailability",
    "availability",
    "coaAvailable",
    "sdsAvailable",
    "sdsUrl",
    "dslStatus",
    "tscaCertification",
    "rtecsNumber",
    "coaLotFormat",
    "shippingConditions",
    "tariffCode",
    "safetyStatement",
    "showSingleLotAvailability",
  ].join(","),
  [
    "HKR-CARB-001",
    "carbohydrates",
    "monosaccharides",
    "Example Chemical",
    "(2R,3S)-IUPAC name",
    "572-09-8",
    "C14H19BrO9",
    "411.20 g/mol",
    ">=98%",
    "Off-white solid",
    "DCM|DMSO|Acetone",
    "Short description",
    "Detailed description",
    '"Glycosylation|Route scouting"',
    "-20 C under inert atmosphere",
    '"100 mg|500 mg|1 g"',
    '"100 mg|500 mg|1 g"',
    '"$140.00|$500.00|$900.00"',
    '"In stock|In stock|Made to order"',
    "In stock",
    "true",
    "true",
    "https://example.com/sds.pdf",
    "DSL listed",
    "TSCA listed",
    "AB1234567",
    "ABC12345",
    "Ambient temperature",
    "2939.99.0000",
    "Not a dangerous substance according to GHS.",
    "false",
  ].join(","),
].join("\n");

function emptyProduct(): CatalogProduct {
  return {
    id: "",
    slug: "",
    imageUrl: "",
    catalogNumber: "",
    categorySlug: "",
    subcategorySlug: "",
    chemicalName: "",
    alternativeName: "",
    casNumber: "",
    molecularFormula: "",
    molecularWeight: "",
    purity: "",
    appearance: "",
    solubility: "",
    shortDescription: "",
    detailedDescription: "",
    applications: [],
    storageConditions: "",
    packSizes: [],
    variants: [],
    availability: "Quote required",
    coaAvailable: false,
    sdsAvailable: false,
    sdsUrl: "",
    dslStatus: "",
    tscaCertification: "",
    rtecsNumber: "",
    coaLotFormat: "",
    shippingConditions: "",
    tariffCode: "",
    safetyStatement: "",
    showSingleLotAvailability: false,
  };
}

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubRow[]>([]);
  const [form, setForm] = useState<CatalogProduct>(emptyProduct());
  const [search, setSearch] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [missingSa, setMissingSa] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingSa(false);
    try {
      const [p, c, s] = await Promise.all([
        adminApi<{ products: ProductRow[] }>("/api/admin/products"),
        adminApi<{ categories: CatRow[] }>("/api/admin/categories"),
        adminApi<{ subcategories: SubRow[] }>("/api/admin/subcategories"),
      ]);
      setProducts(p.products ?? []);
      setCategories(
        (c.categories ?? []).map((x) => ({
          slug: String(x.slug ?? ""),
          name: String(x.name ?? x.slug ?? ""),
        })),
      );
      setSubcategories(
        (s.subcategories ?? []).map((x) => ({
          slug: String(x.slug ?? ""),
          name: String(x.name ?? x.slug ?? ""),
          categorySlug: String(x.categorySlug ?? ""),
        })),
      );
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setProducts([]);
        setCategories([]);
        setSubcategories([]);
      } else {
        setError(e instanceof Error ? e.message : "Load failed");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pick(p: ProductRow) {
    setForm({
      id: String(p.id ?? p.slug),
      slug: String(p.slug),
      imageUrl: String(p.imageUrl ?? ""),
      catalogNumber: String(p.catalogNumber ?? ""),
      categorySlug: String(p.categorySlug ?? ""),
      subcategorySlug: String(p.subcategorySlug ?? ""),
      chemicalName: String(p.chemicalName ?? ""),
      alternativeName: String(p.alternativeName ?? ""),
      casNumber: String(p.casNumber ?? ""),
      molecularFormula: String(p.molecularFormula ?? ""),
      molecularWeight: String(p.molecularWeight ?? ""),
      purity: String(p.purity ?? ""),
      appearance: String(p.appearance ?? ""),
      solubility: String(p.solubility ?? ""),
      shortDescription: String(p.shortDescription ?? ""),
      detailedDescription: String(p.detailedDescription ?? ""),
      applications: Array.isArray(p.applications) ? [...p.applications] : [],
      storageConditions: String(p.storageConditions ?? ""),
      packSizes: Array.isArray(p.packSizes) ? [...p.packSizes] : [],
      variants: Array.isArray(p.variants)
        ? (p.variants as ProductVariant[]).map((v) => ({
            size: String(v.size ?? ""),
            price: String(v.price ?? ""),
            availabilityLabel: String(v.availabilityLabel ?? ""),
          }))
        : [],
      availability: AVAIL.includes(p.availability as ProductAvailability)
        ? (p.availability as ProductAvailability)
        : "Quote required",
      coaAvailable: Boolean(p.coaAvailable),
      sdsAvailable: Boolean(p.sdsAvailable),
      sdsUrl: p.sdsUrl ? String(p.sdsUrl) : "",
      dslStatus: p.dslStatus ? String(p.dslStatus) : "",
      tscaCertification: p.tscaCertification ? String(p.tscaCertification) : "",
      rtecsNumber: p.rtecsNumber ? String(p.rtecsNumber) : "",
      coaLotFormat: p.coaLotFormat ? String(p.coaLotFormat) : "",
      shippingConditions: p.shippingConditions ? String(p.shippingConditions) : "",
      tariffCode: p.tariffCode ? String(p.tariffCode) : "",
      safetyStatement: p.safetyStatement ? String(p.safetyStatement) : "",
      showSingleLotAvailability: Boolean(p.showSingleLotAvailability),
    });
    setActiveSlug(String(p.slug));
    setDetailMode("edit");
  }

  function view(p: ProductRow) {
    setActiveSlug(String(p.slug));
    setDetailMode("view");
  }

  function createNew() {
    setForm(emptyProduct());
    setActiveSlug(null);
    setDetailMode("create");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const slug = form.slug.trim();
    const payload = {
      ...form,
      slug,
      id: form.id.trim() || slug,
      applications: form.applications.map((s) => s.trim()).filter(Boolean),
      packSizes: form.packSizes.map((s) => s.trim()).filter(Boolean),
      variants: (form.variants ?? [])
        .map((v) => ({
          size: v.size.trim(),
          price: v.price.trim(),
          availabilityLabel: v.availabilityLabel.trim(),
        }))
        .filter((v) => v.size),
    };
    try {
      await adminApi("/api/admin/products", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      await load();
      setForm(emptyProduct());
      setActiveSlug(null);
      setDetailMode(null);
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function clearSelection() {
    setSelectedSlugs(new Set());
  }

  function toggleSelect(slug: string) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    const slugs = filteredProducts.map((p) => String(p.slug));
    const allSelected = slugs.length > 0 && slugs.every((s) => selectedSlugs.has(s));
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const s of slugs) next.delete(s);
      } else {
        for (const s of slugs) next.add(s);
      }
      return next;
    });
  }

  function closeDetailIfDeleted(slugs: string[]) {
    const deleted = new Set(slugs);
    if (activeSlug && deleted.has(activeSlug)) {
      setActiveSlug(null);
      setDetailMode(null);
    }
    if (form.slug && deleted.has(form.slug)) {
      setForm(emptyProduct());
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete product "${slug}"?`)) return;
    setError(null);
    try {
      await adminApi(`/api/admin/products?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      await load();
      setSelectedSlugs((prev) => {
        if (!prev.has(slug)) return prev;
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
      closeDetailIfDeleted([slug]);
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function bulkRemove() {
    const slugs = [...selectedSlugs];
    if (slugs.length === 0) return;
    const label =
      slugs.length === 1
        ? `Delete product "${slugs[0]}"?`
        : `Delete ${slugs.length} selected products? This cannot be undone.`;
    if (!confirm(label)) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await adminApi<{ deleted: number }>("/api/admin/products", {
        method: "DELETE",
        body: JSON.stringify({ slugs }),
      });
      await load();
      clearSelection();
      closeDetailIfDeleted(slugs);
      setImportResult(`Deleted ${res.deleted ?? slugs.length} product(s).`);
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function importCsv(file: File) {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const records = parseCsv(text);
      const rows = records.map((r) => {
        const sizes = splitMulti(String(r.variantSizes ?? ""));
        const prices = splitMulti(String(r.variantPrices ?? ""));
        const availLabels = splitMulti(String(r.variantAvailability ?? ""));
        const variants = sizes
          .map((size, i) => ({
            size,
            price: (prices[i] ?? "").trim(),
            availabilityLabel: (availLabels[i] ?? "").trim(),
          }))
          .filter((v) => v.size);

        return {
          catalogNumber: String(r.catalogNumber ?? "").trim(),
          categorySlug: String(r.categorySlug ?? "").trim(),
          subcategorySlug: String(r.subcategorySlug ?? "").trim(),
          chemicalName: String(r.chemicalName ?? "").trim(),
          alternativeName: String(r.alternativeName ?? "").trim(),
          casNumber: String(r.casNumber ?? "").trim(),
          molecularFormula: String(r.molecularFormula ?? "").trim(),
          molecularWeight: String(r.molecularWeight ?? "").trim(),
          purity: String(r.purity ?? "").trim(),
          appearance: String(r.appearance ?? "").trim(),
          solubility: String(r.solubility ?? "").trim(),
          shortDescription: String(r.shortDescription ?? "").trim(),
          detailedDescription: String(r.detailedDescription ?? "").trim(),
          applications: splitMulti(String(r.applications ?? "")),
          storageConditions: String(r.storageConditions ?? "").trim(),
          packSizes: splitMulti(String(r.packSizes ?? "")),
          variants,
          availability: String(r.availability ?? "Quote required").trim(),
          coaAvailable: parseBoolean(String(r.coaAvailable ?? "")),
          sdsAvailable: parseBoolean(String(r.sdsAvailable ?? "")),
          sdsUrl: String(r.sdsUrl ?? "").trim(),
          dslStatus: String(r.dslStatus ?? "").trim(),
          tscaCertification: String(r.tscaCertification ?? "").trim(),
          rtecsNumber: String(r.rtecsNumber ?? "").trim(),
          coaLotFormat: String(r.coaLotFormat ?? "").trim(),
          shippingConditions: String(r.shippingConditions ?? "").trim(),
          tariffCode: String(r.tariffCode ?? "").trim(),
          safetyStatement: String(r.safetyStatement ?? "").trim(),
          showSingleLotAvailability: parseBoolean(String(r.showSingleLotAvailability ?? "")),
        };
      });
      const res = await adminApi<{ imported: number }>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setImportResult(`Imported ${res.imported ?? 0} products.`);
      await load();
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setImporting(false);
    }
  }

  function downloadSampleCsv() {
    const blob = new Blob([PRODUCT_SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const formSubcategories = useMemo(
    () => subcategories.filter((s) => s.categorySlug === form.categorySlug),
    [form.categorySlug, subcategories],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const haystack = `${p.catalogNumber} ${p.slug} ${p.chemicalName} ${p.categorySlug} ${p.casNumber ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, search]);
  const activeProduct = useMemo(
    () => (activeSlug ? products.find((p) => String(p.slug) === activeSlug) ?? null : null),
    [activeSlug, products],
  );

  const filteredSlugs = useMemo(
    () => filteredProducts.map((p) => String(p.slug)),
    [filteredProducts],
  );

  const selectedCount = selectedSlugs.size;
  const selectedInFilterCount = useMemo(
    () => filteredSlugs.filter((s) => selectedSlugs.has(s)).length,
    [filteredSlugs, selectedSlugs],
  );
  const allFilteredSelected =
    filteredSlugs.length > 0 && selectedInFilterCount === filteredSlugs.length;
  const someFilteredSelected =
    selectedInFilterCount > 0 && selectedInFilterCount < filteredSlugs.length;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someFilteredSelected;
  }, [someFilteredSelected]);

  useEffect(() => {
    const visible = new Set(filteredSlugs);
    setSelectedSlugs((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const slug of prev) {
        if (visible.has(slug)) next.add(slug);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredSlugs]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        subtitle="Manage SKU entries, specifications, availability states, and related items across the catalogue."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-on-dark-muted transition hover:border-white/40 hover:bg-white/16 hover:text-on-dark"
          >
            Refresh list
          </button>
        }
      />

      {missingSa ? <SetupCredentialsCallout /> : null}

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}
      {importResult ? (
        <p className="rounded-xl border border-primary/25 bg-tint-primary/20 px-4 py-3 text-sm text-foreground">{importResult}</p>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Catalogue entries</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, slug, name, category, CAS..."
              className="w-80 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
            <button
              type="button"
              onClick={createNew}
              className="rounded-full bg-cta-gradient-diagonal px-5 py-2 text-sm font-semibold text-primary-foreground shadow-primary-glow"
            >
              Add product
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-foreground disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              Sample CSV
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importCsv(file);
            e.currentTarget.value = "";
          }}
        />
        {selectedCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/25 bg-tint-danger/25 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              <span className="font-semibold tabular-nums">{selectedCount}</span> product
              {selectedCount === 1 ? "" : "s"} selected
              {search.trim() && selectedInFilterCount !== selectedCount ? (
                <span className="text-caption-foreground">
                  {" "}
                  ({selectedInFilterCount} in current search)
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={deleting}
                className="rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => void bulkRemove()}
                disabled={deleting}
                className="rounded-full border border-danger/40 bg-danger/15 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/25 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : `Delete selected (${selectedCount})`}
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 font-mono text-[11px] uppercase tracking-wider text-caption-foreground backdrop-blur">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={loading || filteredProducts.length === 0}
                    aria-label={
                      allFilteredSelected
                        ? "Deselect all products in list"
                        : "Select all products in list"
                    }
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                </th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const slug = String(p.slug);
                  const checked = selectedSlugs.has(slug);
                  return (
                  <tr
                    key={slug}
                    onClick={() => view(p)}
                    className={`group cursor-pointer transition-colors hover:bg-tint-primary/15 ${
                      checked ? "bg-tint-danger/12" : "bg-card"
                    }`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(slug)}
                        aria-label={`Select ${p.chemicalName || slug}`}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.catalogNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.slug}</td>
                    <td className="max-w-[200px] truncate px-3 py-2" title={p.chemicalName}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{p.chemicalName}</span>
                        <span className="shrink-0 text-caption-foreground transition-transform duration-200 group-hover:translate-x-0.5">
                          →
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-caption-foreground">{p.categorySlug}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailMode === "view" && activeProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,14,27,0.62)] p-4 backdrop-blur-sm" onClick={() => {
          setActiveSlug(null);
          setDetailMode(null);
        }}>
        <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-elevated-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Product details</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => pick(activeProduct)}
                className="rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void remove(String(activeProduct.slug))}
                className="rounded-full border border-danger/35 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSlug(null);
                  setDetailMode(null);
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
          <DetailGrid className="mt-4">
            <DetailItem label="SKU" value={String(activeProduct.catalogNumber ?? "—")} mono />
            <DetailItem label="Slug" value={String(activeProduct.slug ?? "—")} mono />
            <DetailImageItem url={String(activeProduct.imageUrl ?? "")} />
            <DetailItem label="Chemical name" value={String(activeProduct.chemicalName ?? "—")} />
            <DetailItem label="Category" value={String(activeProduct.categorySlug ?? "—")} />
            <DetailItem label="Subcategory" value={String(activeProduct.subcategorySlug ?? "—")} />
            <DetailItem label="CAS" value={String(activeProduct.casNumber ?? "—")} />
            <DetailItem label="Availability" value={String(activeProduct.availability ?? "—")} />
            <DetailItem label="Formula" value={String(activeProduct.molecularFormula ?? "—")} />
            <DetailItem label="Mol. weight" value={String(activeProduct.molecularWeight ?? "—")} />
            <DetailItem label="Purity" value={String(activeProduct.purity ?? "—")} />
            <DetailItem label="Appearance" value={String(activeProduct.appearance ?? "—")} />
            <DetailItem
              label="Storage"
              value={String(activeProduct.storageConditions ?? "—")}
              className="sm:col-span-2"
            />
          </DetailGrid>
        </section>
        </div>
      ) : null}

      {detailMode === "edit" || detailMode === "create" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,14,27,0.62)] p-4 backdrop-blur-sm" onClick={() => {
          setDetailMode(null);
          setActiveSlug(null);
          setForm(emptyProduct());
        }}>
        <section className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-elevated-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {detailMode === "create" ? "Add product" : "Edit product"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDetailMode(null);
                setActiveSlug(null);
                setForm(emptyProduct());
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
        <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Slug</label>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, "-") }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Internal id</label>
            <input
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              placeholder="Defaults to slug"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Catalog #</label>
            <input
              required
              value={form.catalogNumber}
              onChange={(e) => setForm((f) => ({ ...f, catalogNumber: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="md:col-span-2">
            <CatalogImageField
              label="Image"
              value={form.imageUrl ?? ""}
              onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
              folder="products"
              entitySlug={form.slug}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Category</label>
            <select
              required
              value={form.categorySlug}
              onChange={(e) => {
                const categorySlug = e.target.value;
                setForm((f) => {
                  const validSub = subcategories.some(
                    (s) => s.slug === f.subcategorySlug && s.categorySlug === categorySlug,
                  );
                  return {
                    ...f,
                    categorySlug,
                    subcategorySlug: validSub ? f.subcategorySlug : "",
                  };
                });
              }}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Subcategory</label>
            <select
              value={form.subcategorySlug ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, subcategorySlug: e.target.value }))}
              disabled={!form.categorySlug || formSubcategories.length === 0}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2 disabled:opacity-60"
            >
              <option value="">None</option>
              {formSubcategories.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">Chemical name</label>
            <input
              required
              value={form.chemicalName}
              onChange={(e) => setForm((f) => ({ ...f, chemicalName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">CAS</label>
            <input
              value={form.casNumber}
              onChange={(e) => setForm((f) => ({ ...f, casNumber: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Availability</label>
            <select
              value={form.availability}
              onChange={(e) =>
                setForm((f) => ({ ...f, availability: e.target.value as ProductAvailability }))
              }
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            >
              {AVAIL.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Formula</label>
            <input
              value={form.molecularFormula}
              onChange={(e) => setForm((f) => ({ ...f, molecularFormula: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Mol. weight</label>
            <input
              value={form.molecularWeight}
              onChange={(e) => setForm((f) => ({ ...f, molecularWeight: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Purity</label>
            <input
              value={form.purity}
              onChange={(e) => setForm((f) => ({ ...f, purity: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Appearance</label>
            <input
              value={form.appearance}
              onChange={(e) => setForm((f) => ({ ...f, appearance: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">Short description</label>
            <textarea
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">Detailed description</label>
            <textarea
              value={form.detailedDescription}
              onChange={(e) => setForm((f) => ({ ...f, detailedDescription: e.target.value }))}
              rows={5}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">Applications (one per line)</label>
            <textarea
              value={form.applications.join("\n")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  applications: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">Storage</label>
            <input
              value={form.storageConditions}
              onChange={(e) => setForm((f) => ({ ...f, storageConditions: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">Pack sizes (one per line)</label>
            <textarea
              value={form.packSizes.join("\n")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  packSizes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                }))
              }
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.coaAvailable}
                onChange={(e) => setForm((f) => ({ ...f, coaAvailable: e.target.checked }))}
              />
              COA
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.sdsAvailable}
                onChange={(e) => setForm((f) => ({ ...f, sdsAvailable: e.target.checked }))}
              />
              SDS
            </label>
          </div>
          <ProductExtendedFields form={form} setForm={setForm} />
          <div className="md:col-span-2 flex flex-wrap gap-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cta-gradient-diagonal px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-primary-glow disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(emptyProduct());
                setActiveSlug(null);
                setDetailMode("create");
              }}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Clear form
            </button>
          </div>
        </form>
      </section>
      </div>
      ) : null}
    </div>
  );
}
