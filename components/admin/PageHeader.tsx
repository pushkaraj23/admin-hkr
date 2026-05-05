import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow = "Admin",
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#020A63] p-4 text-on-dark shadow-[0_14px_44px_-18px_rgba(2,10,99,0.55)] backdrop-blur-md md:p-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 42%, transparent) 0%, transparent 68%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 bottom-[-45%] h-52 w-52 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 36%, transparent) 0%, transparent 72%)",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: "var(--footer-grid)", backgroundSize: "24px 24px" }} aria-hidden />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-on-dark md:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-dark-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}
