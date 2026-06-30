"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import { parseCsv } from "@/lib/admin/csv";
import type { ProductSubcategory } from "@/lib/types/catalog";

type SubRow = ProductSubcategory & Record<string, unknown>;
type CatRow = { slug: string; name: string };

const empty = (): ProductSubcategory => ({
  slug: "",
  categorySlug: "",
  name: "",
  description: "",
  order: 0,
});

const SUBCATEGORY_SAMPLE_CSV = [
  "categorySlug,name,description,order",
  "carbohydrates,Monosaccharides,Single-unit sugars and derivatives,1",
].join("\n");

export default function SubcategoriesAdminPage() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [form, setForm] = useState<ProductSubcategory>(empty);
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
      const [subRes, catRes] = await Promise.all([
        adminApi<{ subcategories: SubRow[] }>("/api/admin/subcategories"),
        adminApi<{ categories: CatRow[] }>("/api/admin/categories"),
      ]);
      setRows(subRes.subcategories ?? []);
      setCategories(
        (catRes.categories ?? []).map((x) => ({
          slug: String(x.slug ?? ""),
          name: String(x.name ?? x.slug ?? ""),
        })),
      );
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setRows([]);
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

  function edit(s: SubRow) {
    setForm({
      slug: s.slug,
      categorySlug: String(s.categorySlug ?? ""),
      name: s.name,
      description: String(s.description ?? ""),
      order: typeof s.order === "number" ? s.order : 0,
    });
    setActiveSlug(s.slug);
    setDetailMode("edit");
  }

  function view(s: SubRow) {
    setActiveSlug(s.slug);
    setDetailMode("view");
  }

  function createNew() {
    setForm(empty());
    setActiveSlug(null);
    setDetailMode("create");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi("/api/admin/subcategories", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await load();
      setForm(empty());
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
    if (!confirm(`Delete subcategory "${slug}"?`)) return;
    setError(null);
    try {
      await adminApi(`/api/admin/subcategories?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      await load();
      if (form.slug === slug || activeSlug === slug) {
        setForm(empty());
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => {
      const haystack = `${s.slug} ${s.name} ${s.categorySlug} ${s.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const activeRow = useMemo(
    () => (activeSlug ? rows.find((row) => row.slug === activeSlug) ?? null : null),
    [activeSlug, rows],
  );

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  async function importCsv(file: File) {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const records = parseCsv(text);
      const importRows = records.map((r) => ({
        categorySlug: String(r.categorySlug ?? "").trim(),
        name: String(r.name ?? "").trim(),
        description: String(r.description ?? "").trim(),
        order: Number.parseInt(String(r.order ?? "0"), 10) || 0,
      }));
      const res = await adminApi<{ imported: number }>("/api/admin/subcategories", {
        method: "POST",
        body: JSON.stringify({ rows: importRows }),
      });
      setImportResult(`Imported ${res.imported ?? 0} subcategories.`);
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
    const blob = new Blob([SUBCATEGORY_SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subcategories-sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Subcategories"
        subtitle="Group products within each category. Assign subcategories on the Products screen."
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Saved subcategories</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slug, name, category…"
              className="w-72 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
            <button
              type="button"
              onClick={createNew}
              className="rounded-full bg-cta-gradient-diagonal px-5 py-2 text-sm font-semibold text-primary-foreground shadow-primary-glow"
            >
              Add subcategory
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
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 font-mono text-[11px] uppercase tracking-wider text-caption-foreground">
              <tr>
                <th className="px-3 py-2">Order</th>
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
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    No subcategories found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((s) => (
                  <tr
                    key={s.slug}
                    onClick={() => view(s)}
                    className="group cursor-pointer bg-card transition-colors hover:bg-tint-primary/15"
                  >
                    <td className="px-3 py-2 tabular-nums text-caption-foreground">{s.order ?? 0}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.slug}</td>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2 text-caption-foreground">
                      {categoryName(String(s.categorySlug ?? ""))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailMode === "view" && activeRow ? (
        <DetailModal onClose={() => { setActiveSlug(null); setDetailMode(null); }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Subcategory details</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => edit(activeRow)}
                className="rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void remove(activeRow.slug)}
                className="rounded-full border border-danger/35 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger"
              >
                Delete
              </button>
              <CloseButton onClose={() => { setActiveSlug(null); setDetailMode(null); }} />
            </div>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailItem label="Slug" value={activeRow.slug} mono />
            <DetailItem label="Name" value={activeRow.name} />
            <DetailItem label="Parent category" value={categoryName(String(activeRow.categorySlug ?? ""))} />
            <DetailItem label="Sort order" value={String(activeRow.order ?? 0)} />
            <DetailItem label="Description" value={String(activeRow.description ?? "—")} />
          </dl>
        </DetailModal>
      ) : null}

      {detailMode === "edit" || detailMode === "create" ? (
        <DetailModal
          onClose={() => {
            setDetailMode(null);
            setActiveSlug(null);
            setForm(empty());
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {detailMode === "create" ? "Add subcategory" : "Edit subcategory"}
            </h2>
            <CloseButton
              onClose={() => {
                setDetailMode(null);
                setActiveSlug(null);
                setForm(empty());
              }}
            />
          </div>
          <form onSubmit={save} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-caption-foreground">Slug (URL)</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, "-") }))
                  }
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
                  placeholder="e.g. monosaccharides"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-caption-foreground">Sort order</label>
                <input
                  type="number"
                  value={form.order ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">Parent category</label>
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
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">Description (optional)</label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cta-gradient-diagonal px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-primary-glow disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save subcategory"}
            </button>
          </form>
        </DetailModal>
      ) : null}
    </div>
  );
}

function DetailModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,14,27,0.62)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-elevated-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
    >
      Close
    </button>
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
