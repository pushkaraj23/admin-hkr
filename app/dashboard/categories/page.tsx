"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import type { ProductCategory } from "@/lib/types/catalog";

type CatRow = ProductCategory & Record<string, unknown>;

const empty = (): ProductCategory => ({
  slug: "",
  name: "",
  tagline: "",
  description: "",
  overview: "",
  highlights: [],
  order: 0,
});

export default function CategoriesAdminPage() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [form, setForm] = useState<ProductCategory>(empty);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingSa, setMissingSa] = useState(false);

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
      tagline: c.tagline,
      description: c.description,
      overview: c.overview,
      highlights: Array.isArray(c.highlights) ? [...c.highlights] : [],
      order: typeof c.order === "number" ? c.order : 0,
    });
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
    if (!confirm(`Delete category "${slug}"?`)) return;
    setError(null);
    try {
      await adminApi(`/api/admin/categories?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      await load();
      if (form.slug === slug) setForm(empty());
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const highlightsText = form.highlights.join("\n");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        subtitle="Define product families, messaging, highlights, and sort order for public catalogue pages."
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

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Saved categories</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-muted/50 font-mono text-[11px] uppercase tracking-wider text-caption-foreground">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={c.slug} className="bg-card">
                      <td className="px-3 py-2 tabular-nums text-caption-foreground">{c.order ?? 0}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.slug}</td>
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => edit(c)}
                          className="mr-2 text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(c.slug)}
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
          <h2 className="font-display text-lg font-semibold text-foreground">Add or update</h2>
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
                onClick={() => setForm(empty())}
                className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Clear form
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
