"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { CatalogImageField } from "@/components/admin/CatalogImageField";
import { DetailGrid, DetailImageItem, DetailItem } from "@/components/admin/DetailGrid";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import { parseCsv, splitMulti } from "@/lib/admin/csv";
import type { ProductCategory } from "@/lib/types/catalog";

type CatRow = ProductCategory & Record<string, unknown>;

const empty = (): ProductCategory => ({
  slug: "",
  name: "",
  imageUrl: "",
  tagline: "",
  description: "",
  overview: "",
  highlights: [],
  order: 0,
});

const CATEGORY_SAMPLE_CSV = [
  "slug,name,imageUrl,tagline,description,overview,highlights,order",
  'carbohydrates,Carbohydrates,https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200,High-purity building blocks,Short description,Long overview,"HPLC validated|Scale-up support|Custom synthesis",1',
].join("\n");

export default function CategoriesAdminPage() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [form, setForm] = useState<ProductCategory>(empty);
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
      const res = await adminApi<{ categories: CatRow[] }>("/api/admin/categories");
      setRows(res.categories ?? []);
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setRows([]);
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

  function edit(c: CatRow) {
    setForm({
      slug: c.slug,
      name: c.name,
      imageUrl: String(c.imageUrl ?? ""),
      tagline: c.tagline,
      description: c.description,
      overview: c.overview,
      highlights: Array.isArray(c.highlights) ? [...c.highlights] : [],
      order: typeof c.order === "number" ? c.order : 0,
    });
    setActiveSlug(c.slug);
    setDetailMode("edit");
  }

  function view(c: CatRow) {
    setActiveSlug(c.slug);
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
      await adminApi("/api/admin/categories", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          highlights: form.highlights.filter(Boolean),
        }),
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
    const slugs = filteredRows.map((c) => c.slug);
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
      setForm(empty());
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete category "${slug}"?`)) return;
    setError(null);
    try {
      await adminApi(`/api/admin/categories?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
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
        ? `Delete category "${slugs[0]}"?`
        : `Delete ${slugs.length} selected categories? This cannot be undone.`;
    if (!confirm(label)) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await adminApi<{ deleted: number }>("/api/admin/categories", {
        method: "DELETE",
        body: JSON.stringify({ slugs }),
      });
      await load();
      clearSelection();
      closeDetailIfDeleted(slugs);
      setImportResult(`Deleted ${res.deleted ?? slugs.length} categor${slugs.length === 1 ? "y" : "ies"}.`);
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const highlightsText = form.highlights.join("\n");
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => {
      const haystack = `${c.slug} ${c.name} ${c.tagline ?? ""} ${c.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);
  const activeRow = useMemo(
    () => (activeSlug ? rows.find((row) => row.slug === activeSlug) ?? null : null),
    [activeSlug, rows],
  );

  const filteredSlugs = useMemo(() => filteredRows.map((c) => c.slug), [filteredRows]);

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

  async function importCsv(file: File) {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const records = parseCsv(text);
      const rows = records.map((r) => ({
        slug: String(r.slug ?? "").trim().toLowerCase().replace(/\s+/g, "-"),
        name: String(r.name ?? "").trim(),
        imageUrl: String(r.imageUrl ?? "").trim(),
        tagline: String(r.tagline ?? "").trim(),
        description: String(r.description ?? "").trim(),
        overview: String(r.overview ?? "").trim(),
        highlights: splitMulti(String(r.highlights ?? "")),
        order: Number.parseInt(String(r.order ?? "0"), 10) || 0,
      }));
      const res = await adminApi<{ imported: number }>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setImportResult(`Imported ${res.imported ?? 0} categories.`);
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
    const blob = new Blob([CATEGORY_SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "categories-sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        subtitle="Define product families, messaging, highlights, and sort order for public catalogue pages."
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
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Saved categories</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by slug, name, tagline..."
              className="w-72 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
            <button
              type="button"
              onClick={createNew}
              className="rounded-full bg-cta-gradient-diagonal px-5 py-2 text-sm font-semibold text-primary-foreground shadow-primary-glow"
            >
              Add category
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/25 bg-tint-danger/25 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              <span className="font-semibold tabular-nums">{selectedCount}</span> categor
              {selectedCount === 1 ? "y" : "ies"} selected
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
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-muted/50 font-mono text-[11px] uppercase tracking-wider text-caption-foreground">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={loading || filteredRows.length === 0}
                    aria-label={
                      allFilteredSelected
                        ? "Deselect all categories in list"
                        : "Select all categories in list"
                    }
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                </th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Name</th>
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
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((c) => {
                  const checked = selectedSlugs.has(c.slug);
                  return (
                  <tr
                    key={c.slug}
                    onClick={() => view(c)}
                    className={`group cursor-pointer transition-colors hover:bg-tint-primary/15 ${
                      checked ? "bg-tint-danger/12" : "bg-card"
                    }`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(c.slug)}
                        aria-label={`Select ${c.name || c.slug}`}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-caption-foreground">{c.order ?? 0}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.slug}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span>{c.name}</span>
                        <span className="text-caption-foreground transition-transform duration-200 group-hover:translate-x-0.5">
                          →
                        </span>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailMode === "view" && activeRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,14,27,0.62)] p-4 backdrop-blur-sm" onClick={() => {
          setActiveSlug(null);
          setDetailMode(null);
        }}>
        <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-elevated-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Category details</h2>
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
            <DetailItem label="Slug" value={activeRow.slug} mono />
            <DetailItem label="Name" value={activeRow.name} />
            <DetailItem label="Sort order" value={String(activeRow.order ?? 0)} />
            <DetailImageItem url={String(activeRow.imageUrl ?? "")} />
            <DetailItem label="Tagline" value={String(activeRow.tagline ?? "—")} />
            <DetailItem label="Description" value={String(activeRow.description ?? "—")} />
            <DetailItem label="Overview" value={String(activeRow.overview ?? "—")} />
            <DetailItem
              label="Highlights"
              value={(Array.isArray(activeRow.highlights) ? activeRow.highlights : []).join(", ") || "—"}
            />
          </DetailGrid>
        </section>
        </div>
      ) : null}

      {detailMode === "edit" || detailMode === "create" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,14,27,0.62)] p-4 backdrop-blur-sm" onClick={() => {
          setDetailMode(null);
          setActiveSlug(null);
          setForm(empty());
        }}>
        <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-elevated-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {detailMode === "create" ? "Add category" : "Edit category"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDetailMode(null);
                setActiveSlug(null);
                setForm(empty());
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
          <form onSubmit={save} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-caption-foreground">Slug (URL)</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, "-") }))}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
                  placeholder="e.g. carbohydrates"
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
              <label className="text-xs font-semibold uppercase text-caption-foreground">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <CatalogImageField
                label="Image"
                value={form.imageUrl ?? ""}
                onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
                folder="categories"
                entitySlug={form.slug}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">Tagline</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">Short description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">Overview</label>
              <textarea
                value={form.overview}
                onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-caption-foreground">
                Highlights (one per line)
              </label>
              <textarea
                value={highlightsText}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    highlights: e.target.value.split("\n").map((s) => s.trim()),
                  }))
                }
                rows={4}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-cta-gradient-diagonal px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-primary-glow disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save category"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(empty());
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
