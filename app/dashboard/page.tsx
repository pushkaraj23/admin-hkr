"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import { fetchCatalogDocumentCounts } from "@/lib/dashboard/client-counts";

export default function DashboardHomePage() {
  const [counts, setCounts] = useState<{ categories: number; products: number; users: number | null }>({
    categories: 0,
    products: 0,
    users: null,
  });
  const [saConfigured, setSaConfigured] = useState<boolean | null>(null);
  const [prodEmails, setProdEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const u = await adminApi<{ users: unknown[] }>("/api/admin/users");
          if (!cancelled) {
            setCounts((c) => ({ ...c, users: u.users?.length ?? 0 }));
            setError(null);
          }
        } catch (e) {
          if (!cancelled) {
            if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
              setCounts((c) => ({ ...c, users: null }));
              setError(null);
            } else {
              setCounts((c) => ({ ...c, users: null }));
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

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-surface/90 via-card to-tint-primary/15 p-8 shadow-elevated-md md:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--aura-glow-a)" }}
          aria-hidden
        />
        <div className="relative">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">Dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Catalogue &amp; access
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Manage Firestore categories and products for the public site, and administer Firebase Authentication users
            when the service account is configured.
          </p>
          {prodEmails ? (
            <p className="mt-4 max-w-2xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-foreground">
              Production mode: set <code className="font-mono text-xs">ADMIN_EMAILS</code> to restrict who can use this
              panel.
            </p>
          ) : null}
        </div>
      </header>

      {showSaHint ? <SetupCredentialsCallout /> : null}

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <section>
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-caption-foreground">
          At a glance
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Categories"
            value={counts.categories}
            hint="Firestore /categories"
            accent="from-primary/25 to-transparent"
            ring="ring-primary/20"
          />
          <StatCard
            label="Products"
            value={counts.products}
            hint="Firestore /products"
            accent="from-secondary/20 to-transparent"
            ring="ring-secondary/25"
          />
          <StatCard
            label="Auth users"
            value={counts.users === null ? "—" : counts.users}
            hint={counts.users === null ? "Needs service account" : "Firebase Authentication"}
            accent="from-accent/25 to-transparent"
            ring="ring-accent/20"
            dim={counts.users === null}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/categories"
          className="group rounded-2xl border border-border bg-card p-6 shadow-elevated-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-elevated-md"
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">Edit</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-foreground group-hover:text-primary">
            Product families
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">Names, copy, highlights, and sort order for each category.</p>
          <span className="mt-4 inline-flex text-sm font-semibold text-primary group-hover:underline">
            Open categories →
          </span>
        </Link>
        <Link
          href="/dashboard/products"
          className="group rounded-2xl border border-border bg-card p-6 shadow-elevated-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-elevated-md"
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">Edit</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-foreground group-hover:text-primary">SKU entries</h3>
          <p className="mt-2 text-sm text-muted-foreground">Specifications, availability, and related items per product.</p>
          <span className="mt-4 inline-flex text-sm font-semibold text-primary group-hover:underline">
            Open products →
          </span>
        </Link>
      </section>
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
