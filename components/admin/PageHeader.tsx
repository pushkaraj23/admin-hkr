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
        "relative overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/65 p-4 shadow-elevated-sm backdrop-blur-md md:p-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--aura-glow-a)" }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-primary-mid">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
