"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import { parseBoolean, parseCsv, splitMulti } from "@/lib/admin/csv";
import type { CatalogProduct, ProductAvailability } from "@/lib/types/catalog";

type ProductRow = CatalogProduct & Record<string, unknown>;
type CatRow = { slug: string; name: string };

const AVAIL: ProductAvailability[] = ["In stock", "Made to order", "Limited lots", "Quote required"];

const PRODUCT_SAMPLE_CSV = [
  "id,slug,imageUrl,catalogNumber,categorySlug,chemicalName,casNumber,molecularFormula,molecularWeight,purity,appearance,shortDescription,detailedDescription,applications,storageConditions,packSizes,availability,datasheetUrl,coaAvailable,sdsAvailable,relatedSlugs",
  'prod-hkr-carb-001,hkr-carb-001,https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200,HKR-CARB-001,carbohydrates,Example Chemical,572-09-8,C14H19BrO9,411.20 g/mol,>=98%,Off-white solid,Short description,Detailed description,"Glycosylation|Route scouting",-20 C under inert atmosphere,"100 mg|500 mg",In stock,https://example.com/datasheet.pdf,true,true,"hkr-carb-002|hkr-carb-003"',
].join("\n");

function emptyProduct(): CatalogProduct {
  return {
    id: "",
    slug: "",
    imageUrl: "",
    catalogNumber: "",
    categorySlug: "",
    chemicalName: "",
    casNumber: "",
    molecularFormula: "",
    molecularWeight: "",
    purity: "",
    appearance: "",
    shortDescription: "",
    detailedDescription: "",
    applications: [],
    storageConditions: "",
    packSizes: [],
    availability: "Quote required",
    datasheetUrl: "",
    coaAvailable: false,
    sdsAvailable: false,
    relatedSlugs: [],
  };
}

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CatRow[]>([]);
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
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingSa(false);
    try {
      const [p, c] = await Promise.all([
        adminApi<{ products: ProductRow[] }>("/api/admin/products"),
        adminApi<{ categories: CatRow[] }>("/api/admin/categories"),
      ]);
      setProducts(p.products ?? []);
      setCategories(
        (c.categories ?? []).map((x) => ({
          slug: String(x.slug ?? ""),
          name: String(x.name ?? x.slug ?? ""),
        })),
      );
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setProducts([]);
        setCategories([]);
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
      chemicalName: String(p.chemicalName ?? ""),
      casNumber: String(p.casNumber ?? ""),
      molecularFormula: String(p.molecularFormula ?? ""),
      molecularWeight: String(p.molecularWeight ?? ""),
      purity: String(p.purity ?? ""),
      appearance: String(p.appearance ?? ""),
      shortDescription: String(p.shortDescription ?? ""),
      detailedDescription: String(p.detailedDescription ?? ""),
      applications: Array.isArray(p.applications) ? [...p.applications] : [],
      storageConditions: String(p.storageConditions ?? ""),
      packSizes: Array.isArray(p.packSizes) ? [...p.packSizes] : [],
      availability: AVAIL.includes(p.availability as ProductAvailability)
        ? (p.availability as ProductAvailability)
        : "Quote required",
      datasheetUrl: p.datasheetUrl ? String(p.datasheetUrl) : "",
      coaAvailable: Boolean(p.coaAvailable),
      sdsAvailable: Boolean(p.sdsAvailable),
      relatedSlugs: Array.isArray(p.relatedSlugs) ? [...p.relatedSlugs] : [],
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
      relatedSlugs: form.relatedSlugs.map((s) => s.trim()).filter(Boolean),
      datasheetUrl: form.datasheetUrl?.trim() || "",
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

  async function remove(slug: string) {
    if (!confirm(`Delete product "${slug}"?`)) return;
    setError(null);
    try {
      await adminApi(`/api/admin/products?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      await load();
      if (form.slug === slug || activeSlug === slug) {
        setForm(emptyProduct());
        setActiveSlug(null);
        setDetailMode(null);
      }
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function importCsv(file: File) {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const records = parseCsv(text);
      const rows = records.map((r) => ({
        id: String(r.id ?? "").trim(),
        slug: String(r.slug ?? "").trim().toLowerCase().replace(/\s+/g, "-"),
        imageUrl: String(r.imageUrl ?? "").trim(),
        catalogNumber: String(r.catalogNumber ?? "").trim(),
        categorySlug: String(r.categorySlug ?? "").trim(),
        chemicalName: String(r.chemicalName ?? "").trim(),
        casNumber: String(r.casNumber ?? "").trim(),
        molecularFormula: String(r.molecularFormula ?? "").trim(),
        molecularWeight: String(r.molecularWeight ?? "").trim(),
        purity: String(r.purity ?? "").trim(),
        appearance: String(r.appearance ?? "").trim(),
        shortDescription: String(r.shortDescription ?? "").trim(),
        detailedDescription: String(r.detailedDescription ?? "").trim(),
        applications: splitMulti(String(r.applications ?? "")),
        storageConditions: String(r.storageConditions ?? "").trim(),
        packSizes: splitMulti(String(r.packSizes ?? "")),
        availability: String(r.availability ?? "Quote required").trim(),
        datasheetUrl: String(r.datasheetUrl ?? "").trim(),
        coaAvailable: parseBoolean(String(r.coaAvailable ?? "")),
        sdsAvailable: parseBoolean(String(r.sdsAvailable ?? "")),
        relatedSlugs: splitMulti(String(r.relatedSlugs ?? "")),
      }));
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
            className="rounded-full border border-border bg-background/60 px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-tint-primary/20 hover:text-foreground"
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
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 font-mono text-[11px] uppercase tracking-wider text-caption-foreground backdrop-blur">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={String(p.slug)}
                    onClick={() => view(p)}
                    className="group cursor-pointer bg-card transition-colors hover:bg-tint-primary/15"
                  >
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
                ))
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
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailItem label="SKU" value={String(activeProduct.catalogNumber ?? "—")} mono />
            <DetailItem label="Slug" value={String(activeProduct.slug ?? "—")} mono />
            <DetailItem label="Chemical name" value={String(activeProduct.chemicalName ?? "—")} />
            <DetailItem label="Category" value={String(activeProduct.categorySlug ?? "—")} />
            <DetailItem label="CAS" value={String(activeProduct.casNumber ?? "—")} />
            <DetailItem label="Availability" value={String(activeProduct.availability ?? "—")} />
            <DetailItem label="Formula" value={String(activeProduct.molecularFormula ?? "—")} />
            <DetailItem label="Mol. weight" value={String(activeProduct.molecularWeight ?? "—")} />
            <DetailItem label="Purity" value={String(activeProduct.purity ?? "—")} />
            <DetailItem label="Appearance" value={String(activeProduct.appearance ?? "—")} />
            <DetailItem label="Storage" value={String(activeProduct.storageConditions ?? "—")} />
            <DetailItem label="Datasheet URL" value={String(activeProduct.datasheetUrl ?? "—")} />
          </dl>
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
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Image URL</label>
            <input
              value={form.imageUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Category</label>
            <select
              required
              value={form.categorySlug}
              onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}
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
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-caption-foreground">
              Related product slugs (comma or newline)
            </label>
            <textarea
              value={form.relatedSlugs.join("\n")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  relatedSlugs: e.target.value
                    .split(/[\n,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-caption-foreground">Datasheet URL</label>
            <input
              value={form.datasheetUrl}
              onChange={(e) => setForm((f) => ({ ...f, datasheetUrl: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-6 pt-6">
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

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/40 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-caption-foreground">{label}</dt>
      <dd className={`mt-1 text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
