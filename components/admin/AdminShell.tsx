"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  IconCategories,
  IconEnquiries,
  IconLogout,
  IconMenu,
  IconOverview,
  IconProducts,
  IconUsers,
} from "@/components/admin/icons";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/dashboard", label: "Overview", Icon: IconOverview },
  { href: "/dashboard/users", label: "Users", Icon: IconUsers },
  { href: "/dashboard/categories", label: "Categories", Icon: IconCategories },
  { href: "/dashboard/products", label: "Products", Icon: IconProducts },
  { href: "/dashboard/enquiries", label: "Enquiries", Icon: IconEnquiries },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, configured, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!loading && (!configured || !user)) {
      router.replace("/login");
    }
  }, [loading, user, configured, router]);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background px-6 py-20">
        <div
          className="h-9 w-9 animate-pulse rounded-full border-2 border-primary/30 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background md:h-screen md:overflow-hidden">
      {/* Ambient */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 100% -10%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 0% 100%, color-mix(in srgb, var(--secondary) 12%, transparent), transparent 50%)",
        }}
        aria-hidden
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <img
              src="/hkr_logo.png"
              alt="HKR Biotech"
              className="rounded-full border border-border bg-light px-3 py-1 object-contain"
              style={{ height: "44px" }}
            />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-caption-foreground">{user.email}</p>
        </div>
  
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm"
          aria-expanded={mobileNav}
          aria-label={mobileNav ? "Close menu" : "Open menu"}
          onClick={() => setMobileNav((v) => !v)}
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </header>

      {mobileNav ? (
        <nav className="border-b border-border bg-card/95 px-3 py-3 md:hidden">
          <ul className="space-y-1">
            {nav.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-primary/12 text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => void signOut().then(() => router.replace("/login"))}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground"
          >
            <IconLogout className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      ) : null}

      <div className="mx-auto flex max-w-[1600px] md:h-screen">
        {/* Desktop sidebar */}
        <aside className="relative hidden h-screen w-[260px] shrink-0 flex-col border-r border-border bg-surface/95 shadow-[8px_0_24px_rgba(0,0,0,0.22)] backdrop-blur-xl md:sticky md:top-0 md:flex">
          <div className="flex h-full flex-col px-4 pb-6 pt-8">
            <div className="px-2">
              <div className="mb-3">
                <img
                  src="/hkr_logo.png"
                  alt="HKR Biotech"
                  className="h-auto w-full rounded-2xl border border-border bg-light px-6 py-4 object-contain"
                />
              </div>
              <p className="mt-3 line-clamp-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[11px] leading-snug text-caption-foreground">
                {user.email}
              </p>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-1 px-1" aria-label="Admin">
              {nav.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-primary/18 to-transparent text-foreground shadow-[inset_3px_0_0_0_var(--primary)]"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        active
                          ? "border-primary/35 bg-primary/12 text-primary"
                          : "border-transparent bg-background/50 text-caption-foreground group-hover:border-border",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => void signOut().then(() => router.replace("/login"))}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/25 hover:bg-tint-primary/20 hover:text-foreground"
            >
              <IconLogout className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 md:h-screen md:overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-8 md:px-10 md:py-12 lg:max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
