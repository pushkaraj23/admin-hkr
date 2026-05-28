"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  IconCategories,
  IconEnquiries,
  IconOrders,
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
  { href: "/dashboard/subcategories", label: "Subcategories", Icon: IconCategories },
  { href: "/dashboard/products", label: "Products", Icon: IconProducts },
  { href: "/dashboard/enquiries", label: "Enquiries", Icon: IconEnquiries },
  { href: "/dashboard/orders", label: "Orders", Icon: IconOrders },
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
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.4]"
        style={{
          background:
            "radial-gradient(ellipse 95% 55% at 100% -8%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 52%), radial-gradient(ellipse 75% 50% at 0% 100%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 48%), radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in srgb, var(--surface) 8%, transparent), transparent 55%)",
        }}
        aria-hidden
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/15 bg-[#020A63]/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <img
              src="/hkr_logo.png"
              alt="HKR Biotech"
              className="rounded-full border border-white/25 bg-white/95 px-3 py-1 object-contain"
              style={{ height: "44px" }}
            />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-on-dark-muted">{user.email}</p>
        </div>
  
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-on-dark shadow-sm backdrop-blur-lg transition hover:bg-white/15"
          aria-expanded={mobileNav}
          aria-label={mobileNav ? "Close menu" : "Open menu"}
          onClick={() => setMobileNav((v) => !v)}
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </header>

      {mobileNav ? (
        <nav className="border-b border-white/15 bg-[#020A63]/98 px-3 py-3 backdrop-blur-xl md:hidden">
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
                        ? "bg-white/15 text-on-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                        : "text-on-dark-muted hover:bg-white/10 hover:text-on-dark",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => void signOut().then(() => router.replace("/login"))}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-on-dark-muted transition hover:bg-white/10 hover:text-on-dark"
          >
            <IconLogout className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      ) : null}

      <div className="mx-auto flex max-w-[1600px] md:h-screen">
        {/* Desktop sidebar */}
        <aside className="relative hidden h-screen w-[268px] shrink-0 flex-col border-r border-white/15 bg-[#020A63] shadow-[8px_0_28px_-4px_rgba(2,10,99,0.45)] backdrop-blur-xl md:sticky md:top-0 md:flex">
          <div className="flex h-full flex-col px-4 pb-6 pt-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.2]"
              style={{
                background:
                  "radial-gradient(ellipse 80% 55% at 100% -10%, color-mix(in srgb, var(--primary) 45%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at -10% 100%, color-mix(in srgb, var(--accent) 38%, transparent), transparent 50%)",
              }}
              aria-hidden
            />
            <div className="relative px-2">
              <div className="mb-3">
                <img
                  src="/hkr_logo.png"
                  alt="HKR Biotech"
                  className="h-auto w-full rounded-2xl border border-white/20 bg-white/95 px-6 py-4 object-contain shadow-[0_8px_24px_-12px_rgba(2,10,99,0.35)]"
                />
              </div>
              <p className="mt-3 line-clamp-2 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-[11px] leading-snug text-on-dark-muted backdrop-blur-sm">
                {user.email}
              </p>
            </div>

            <nav className="relative mt-8 flex flex-1 flex-col gap-1 px-1" aria-label="Admin">
              {nav.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-white/14 text-on-dark shadow-[inset_3px_0_0_0_rgb(43,196,138)]"
                        : "text-on-dark-muted hover:bg-white/10 hover:text-on-dark",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        active
                          ? "border-white/28 bg-white/12 text-accent"
                          : "border-transparent bg-white/6 text-on-dark-muted group-hover:border-white/15 group-hover:text-on-dark",
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
              className="relative mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-3 py-2.5 text-xs font-semibold text-on-dark-muted backdrop-blur-sm transition hover:border-accent/40 hover:bg-white/14 hover:text-on-dark"
            >
              <IconLogout className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 border-l border-transparent md:h-screen md:overflow-y-auto md:border-white/10">
          <div className="mx-auto max-w-4xl px-4 py-4 md:px-10 md:py-8 lg:max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
