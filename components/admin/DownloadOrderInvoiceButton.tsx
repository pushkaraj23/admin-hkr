"use client";

import { useState } from "react";
import {
  canDownloadOrderInvoice,
  downloadAdminOrderInvoicePdf,
} from "@/lib/commerce/download-order-invoice";
import {
  adminOrderRowToInvoiceRecord,
  type AdminOrderRow,
} from "@/lib/commerce/map-admin-order";
import { resolveOrderCustomerName } from "@/lib/commerce/order-customer";

type Props = {
  row: AdminOrderRow;
  className?: string;
};

export function DownloadOrderInvoiceButton({ row, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = canDownloadOrderInvoice(row.status);

  async function handleDownload() {
    if (!allowed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await downloadAdminOrderInvoicePdf(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate invoice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={!allowed || busy}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
          allowed
            ? "bg-primary text-primary-foreground shadow-elevated-sm hover:opacity-90 disabled:opacity-70"
            : "cursor-not-allowed border border-border bg-muted text-muted-foreground"
        }`}
      >
        <DownloadIcon />
        {busy ? "Preparing invoice…" : "Download invoice"}
      </button>
      {!allowed ? (
        <p className="mt-2 text-center text-[11px] text-caption-foreground">
          Invoice available once payment is confirmed.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-lg border border-danger/30 bg-tint-danger/40 px-3 py-2 text-center text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Resolved customer display name for order detail UI. */
export function getAdminOrderCustomerName(row: AdminOrderRow): string {
  return resolveOrderCustomerName(adminOrderRowToInvoiceRecord(row));
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}
