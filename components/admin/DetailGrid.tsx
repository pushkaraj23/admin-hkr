import type { ReactNode } from "react";
import { CatalogImagePreview } from "@/components/admin/CatalogImageField";

const cellClass = "h-full rounded-xl border border-border/80 bg-background/40 p-3";

export function DetailItem({
  label,
  value,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`${cellClass} ${className}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-caption-foreground">{label}</dt>
      <dd className={`mt-1 break-words text-sm leading-relaxed text-foreground ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

export function DetailImageItem({
  label = "Image",
  url,
  className = "",
}: {
  label?: string;
  url: string;
  className?: string;
}) {
  return (
    <div className={`${cellClass} ${className}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-caption-foreground">{label}</dt>
      <dd className="mt-2">
        <CatalogImagePreview url={url} size="md" showUrl={false} />
      </dd>
    </div>
  );
}

export function DetailGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <dl className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch ${className}`}>{children}</dl>
  );
}
