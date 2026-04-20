"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import { fetchCatalogDocumentCounts } from "@/lib/dashboard/client-counts";

export default function DashboardHomePage() {
  const [counts, setCounts] = useState<{ categories: number; products: number; users: number | null; enquiries: number | null }>({
    categories: 0,
    products: 0,
    users: null,
    enquiries: null,
  });
  const [saConfigured, setSaConfigured] = useState<boolean | null>(null);
  const [prodEmails, setProdEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    rows: Array<{
      slug: string;
      categorySlug: string;
      chemicalName: string;
      catalogNumber: string;
      score: number;
      totalEvents: number;
      viewFromList: number;
      viewDetail: number;
      wishlistAdds: number;
      cartAdds: number;
      enquirySubmits: number;
      lastEventAtIso: string;
    }>;
    totals: { score: number; totalEvents: number };
    days: number;
  } | null>(null);
  const [enquiryAnalyticsRows, setEnquiryAnalyticsRows] = useState<
    Array<{ status: string; source: string; createdAtIso: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const statusRes = await fetch("/api/admin/status");
        const status = (await statusRes.json()) as {
          serviceAccountConfigured: boolean;
          adminEmailsConfigured: boolean;
          production: boolean;
        };
        if (!cancelled) {
          setSaConfigured(status.serviceAccountConfigured);
          setProdEmails(status.production && !status.adminEmailsConfigured);
        }

        const catCounts = await fetchCatalogDocumentCounts();
        if (!cancelled) {
          setCounts((c) => ({
            ...c,
            categories: catCounts.categories,
            products: catCounts.products,
          }));
        }

        try {
          const [u, enquiries] = await Promise.all([
            adminApi<{ users: unknown[] }>("/api/admin/users"),
            adminApi<{ total: number }>("/api/admin/enquiries?limit=1"),
          ]);
          if (!cancelled) {
            setCounts((c) => ({
              ...c,
              users: u.users?.length ?? 0,
              enquiries: enquiries.total ?? 0,
            }));
            setError(null);
          }
          try {
            const analyticsRes = await adminApi<{
              rows: Array<{
                slug: string;
                categorySlug: string;
                chemicalName: string;
                catalogNumber: string;
                score: number;
                totalEvents: number;
                viewFromList: number;
                viewDetail: number;
                wishlistAdds: number;
                cartAdds: number;
                enquirySubmits: number;
                lastEventAtIso: string;
              }>;
              totals: { score: number; totalEvents: number };
              days: number;
            }>("/api/admin/analytics/product-interest?days=30&limit=12");
            if (!cancelled) {
              setAnalytics(analyticsRes);
            }
          } catch {
            if (!cancelled) {
              setAnalytics(null);
            }
          }
          try {
            const enquiryAnalytics = await adminApi<{
              enquiries: Array<{ status: string; source: string; createdAtIso: string }>;
            }>("/api/admin/enquiries?limit=250");
            if (!cancelled) {
              setEnquiryAnalyticsRows(enquiryAnalytics.enquiries ?? []);
            }
          } catch {
            if (!cancelled) {
              setEnquiryAnalyticsRows([]);
            }
          }
        } catch (e) {
          if (!cancelled) {
            if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
              setCounts((c) => ({ ...c, users: null, enquiries: null }));
              setError(null);
            } else {
              setCounts((c) => ({ ...c, users: null, enquiries: null }));
              setError(e instanceof Error ? e.message : "Could not load users");
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load overview");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const showSaHint = saConfigured === false;
  const productTopBars = useMemo(() => {
    if (!analytics?.rows?.length) return [];
    const maxScore = Math.max(...analytics.rows.map((r) => r.score), 1);
    return analytics.rows.slice(0, 6).map((row) => ({
      label: row.chemicalName || row.slug,
      value: row.score,
      widthPct: Math.max(6, Math.round((row.score / maxScore) * 100)),
      subLabel: `${row.catalogNumber || "—"} • ${row.categorySlug || "uncategorized"}`,
    }));
  }, [analytics]);

  const productEventMix = useMemo(() => {
    if (!analytics?.rows?.length) {
      return [
        { label: "List views", value: 0, tone: "bg-primary/70" },
        { label: "Detail views", value: 0, tone: "bg-primary-mid/70" },
        { label: "Wishlist adds", value: 0, tone: "bg-accent/70" },
        { label: "Cart adds", value: 0, tone: "bg-secondary/70" },
        { label: "Enquiries", value: 0, tone: "bg-warning/75" },
      ];
    }
    const totals = analytics.rows.reduce(
      (acc, row) => {
        acc.list += row.viewFromList;
        acc.detail += row.viewDetail;
        acc.wishlist += row.wishlistAdds;
        acc.cart += row.cartAdds;
        acc.enquiry += row.enquirySubmits;
        return acc;
      },
      { list: 0, detail: 0, wishlist: 0, cart: 0, enquiry: 0 },
    );
    return [
      { label: "List views", value: totals.list, tone: "bg-primary/70" },
      { label: "Detail views", value: totals.detail, tone: "bg-primary-mid/70" },
      { label: "Wishlist adds", value: totals.wishlist, tone: "bg-accent/70" },
      { label: "Cart adds", value: totals.cart, tone: "bg-secondary/70" },
      { label: "Enquiries", value: totals.enquiry, tone: "bg-warning/75" },
    ];
  }, [analytics]);

  const enquiryStatusMix = useMemo(() => {
    const counts = enquiryAnalyticsRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.status || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { label: "New", value: counts.new ?? 0, tone: "bg-primary/70" },
      { label: "In progress", value: counts.in_progress ?? 0, tone: "bg-accent/70" },
      { label: "Responded", value: counts.responded ?? 0, tone: "bg-secondary/70" },
      { label: "Closed", value: counts.closed ?? 0, tone: "bg-muted-foreground/70" },
      { label: "Spam", value: counts.spam ?? 0, tone: "bg-danger/70" },
    ];
  }, [enquiryAnalyticsRows]);

  const enquirySourceBars = useMemo(() => {
    const map = enquiryAnalyticsRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.source || "website";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const max = Math.max(...sorted.map(([, value]) => value), 1);
    return sorted.map(([source, value]) => ({
      label: source,
      value,
      widthPct: Math.max(8, Math.round((value / max) * 100)),
      subLabel: "Enquiry source",
    }));
  }, [enquiryAnalyticsRows]);

  const enquiryTrend = useMemo(() => {
    const days = 14;
    const buckets = new Array(days).fill(0);
    const today = new Date();
    const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    for (const row of enquiryAnalyticsRows) {
      const iso = row.createdAtIso;
      if (!iso) continue;
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) continue;
      const dayUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const diff = Math.floor((base - dayUtc) / 86400000);
      if (diff >= 0 && diff < days) {
        const idx = days - diff - 1;
        buckets[idx] += 1;
      }
    }
    const max = Math.max(...buckets, 1);
    return buckets.map((count, index) => ({ count, heightPct: Math.max(count ? 12 : 6, Math.round((count / max) * 100)), index }));
  }, [enquiryAnalyticsRows]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Dashboard"
        title="Catalogue & access"
        subtitle="Control catalogue content and team access from one place when admin credentials are configured."
      />

      {prodEmails ? (
        <p className="max-w-2xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-foreground">
          Production mode: set <code className="font-mono text-xs">ADMIN_EMAILS</code> to restrict who can use this panel.
        </p>
      ) : null}

      {showSaHint ? <SetupCredentialsCallout /> : null}

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <section>
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-caption-foreground">
          At a glance
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Categories"
            value={counts.categories}
            hint="Catalogue families"
            accent="from-primary/25 to-transparent"
            ring="ring-primary/20"
          />
          <StatCard
            label="Products"
            value={counts.products}
            hint="Catalogue entries"
            accent="from-secondary/20 to-transparent"
            ring="ring-secondary/25"
          />
          <StatCard
            label="Auth users"
            value={counts.users === null ? "—" : counts.users}
            hint={counts.users === null ? "Needs service account" : "Admin accounts"}
            accent="from-accent/25 to-transparent"
            ring="ring-accent/20"
            dim={counts.users === null}
          />
          <StatCard
            label="Enquiries"
            value={counts.enquiries === null ? "—" : counts.enquiries}
            hint={counts.enquiries === null ? "Needs service account" : "Inbound leads"}
            accent="from-primary-mid/20 to-transparent"
            ring="ring-primary-mid/20"
            dim={counts.enquiries === null}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-caption-foreground">
              Product interest analytics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Weighted signals from website behaviour (detail views, wishlist, cart, and enquiry actions).
            </p>
          </div>
          <Link
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary/55 hover:bg-primary/15"
          >
            Open Google Analytics
          </Link>
        </div>

        {!analytics ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No interest analytics yet. Once users interact with products, this panel will show top products by intent score.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
              <div className="text-xs text-caption-foreground">
                Last {analytics.days} days • weighted score {analytics.totals.score} • tracked events{" "}
                {analytics.totals.totalEvents}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-foreground">Top products by interest score</h3>
              <div className="mt-4 space-y-3">
                {productTopBars.map((item) => (
                  <BarRow key={item.label + item.subLabel} item={item} />
                ))}
                {productTopBars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No product-interest events in selected period.</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
                <h3 className="text-sm font-semibold text-foreground">Behavior mix</h3>
                <p className="mt-1 text-xs text-muted-foreground">Distribution of tracked product interactions</p>
                <div className="mt-4 space-y-2.5">
                  {productEventMix.map((item) => (
                    <ProgressLegendRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      total={productEventMix.reduce((sum, curr) => sum + curr.value, 0)}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
                <h3 className="text-sm font-semibold text-foreground">Enquiry status mix</h3>
                <p className="mt-1 text-xs text-muted-foreground">Operational load split across statuses</p>
                <div className="mt-4 space-y-2.5">
                  {enquiryStatusMix.map((item) => (
                    <ProgressLegendRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      total={enquiryStatusMix.reduce((sum, curr) => sum + curr.value, 0)}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
                <h3 className="text-sm font-semibold text-foreground">Top enquiry sources</h3>
                <p className="mt-1 text-xs text-muted-foreground">Where product enquiries originate</p>
                <div className="mt-4 space-y-3">
                  {enquirySourceBars.map((item) => (
                    <BarRow key={item.label} item={item} />
                  ))}
                  {enquirySourceBars.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No source data available yet.</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
                <h3 className="text-sm font-semibold text-foreground">Enquiry trend (14 days)</h3>
                <p className="mt-1 text-xs text-muted-foreground">Daily enquiry volume snapshot</p>
                <div className="mt-5 flex h-28 items-end gap-1.5 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                  {enquiryTrend.map((point) => (
                    <div
                      key={point.index}
                      className="flex-1 rounded-sm bg-primary/75 transition hover:bg-primary"
                      style={{ height: `${point.heightPct}%` }}
                      title={`${point.count} enquiries`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function BarRow({
  item,
}: {
  item: { label: string; value: number; widthPct: number; subLabel: string };
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
        <p className="shrink-0 text-sm font-semibold text-primary">{item.value}</p>
      </div>
      <p className="truncate text-xs text-muted-foreground">{item.subLabel}</p>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-mid"
          style={{ width: `${item.widthPct}%` }}
        />
      </div>
    </div>
  );
}

function ProgressLegendRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {value} ({pct}%)
        </p>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(pct, value > 0 ? 6 : 0)}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
  ring,
  dim,
}: {
  label: string;
  value: number | string;
  hint: string;
  accent: string;
  ring: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-elevated-sm ${ring} ring-1`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90 ${accent}`}
        aria-hidden
      />
      <div className="relative">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-caption-foreground">{label}</p>
        <p
          className={`mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-foreground ${dim ? "opacity-70" : ""}`}
        >
          {value}
        </p>
        <p className="mt-2 text-xs text-caption-foreground">{hint}</p>
      </div>
    </div>
  );
}
