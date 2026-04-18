"use client";

import { useCallback, useEffect, useState } from "react";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import type { CatalogProduct, ProductAvailability } from "@/lib/types/catalog";

type ProductRow = CatalogProduct & Record<string, unknown>;
type CatRow = { slug: string; name: string };

const AVAIL: ProductAvailability[] = ["In stock", "Made to order", "Limited lots", "Quote required"];

function emptyProduct(): CatalogProduct {
  return {
    id: "",
    slug: "",
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingSa, setMissingSa] = useState(false);

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
      if (form.slug === slug) setForm(emptyProduct());
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Firestore collection <code className="font-mono text-xs">products</code> — document ID = product slug (globally
          unique).
        </p>
      </div>

      {missingSa ? <SetupCredentialsCallout /> : null}

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Catalogue entries</h2>
        <div className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-muted/80 font-mono text-[11px] uppercase tracking-wider text-caption-foreground backdrop-blur">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={String(p.slug)} className="bg-card">
                    <td className="px-3 py-2 font-mono text-xs">{p.catalogNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.slug}</td>
                    <td className="max-w-[200px] truncate px-3 py-2" title={p.chemicalName}>
                      {p.chemicalName}
                    </td>
                    <td className="px-3 py-2 text-caption-foreground">{p.categorySlug}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => pick(p)} className="mr-2 text-primary hover:underline">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(String(p.slug))}
                        className="text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-elevated-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Add or update product</h2>
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
              onClick={() => setForm(emptyProduct())}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Clear form
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
