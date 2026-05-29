"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";
import {
  DownloadOrderInvoiceButton,
  getAdminOrderCustomerName,
} from "@/components/admin/DownloadOrderInvoiceButton";
import type { AdminOrderRow } from "@/lib/commerce/map-admin-order";

type OrderStatus = "pending" | "paid" | "delivered" | "failed" | "cancelled";

type OrderLine = {
  slug: string;
  chemicalName: string;
  catalogNumber: string;
  categorySlug?: string;
  productSlug?: string;
  variantSize?: string;
  variantPrice?: string;
  quantity: number;
  lineTotal: number | null;
};

type OrderRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: OrderStatus;
  lineCount: number;
  totalUnits: number;
  subtotal: number;
  currency: string;
  amountPaise: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  items: OrderLine[];
  adminNotes: string;
  createdAtIso: string;
  paidAtIso: string;
  deliveredAtIso: string;
};

const STATUSES: OrderStatus[] = ["pending", "paid", "delivered", "failed", "cancelled"];
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "INR",
  }).format(amount);
}

function shortOrderId(id: string) {
  if (id.length <= 14) return id;
  return `${id.slice(0, 10)}…`;
}

function orderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "paid":
      return "border-primary/40 bg-tint-primary text-primary-deep";
    case "delivered":
      return "border-accent/45 bg-tint-accent text-accent-foreground";
    case "failed":
      return "border-red-300/80 bg-red-50 text-red-800";
    case "cancelled":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-amber-400/50 bg-amber-50 text-amber-900";
  }
}

export default function OrdersAdminPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [missingSa, setMissingSa] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingSa(false);
    try {
      const params = new URLSearchParams({ limit: "120" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await adminApi<{ orders: OrderRow[] }>(`/api/admin/orders?${params.toString()}`);
      setRows(res.orders ?? []);
      if (activeId && !res.orders?.some((x) => x.id === activeId)) {
        setActiveId(res.orders?.[0]?.id ?? null);
      } else if (!activeId) {
        setActiveId(res.orders?.[0]?.id ?? null);
      }
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setRows([]);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  }, [activeId, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => rows.find((r) => r.id === activeId) ?? null, [activeId, rows]);

  async function updateOrder(id: string, status: OrderStatus, adminNotes?: string) {
    setSavingId(id);
    setError(null);
    try {
      await adminApi("/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ id, status, adminNotes }),
      });
      await load();
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        subtitle="View Razorpay checkout orders, payment references, and fulfilment status."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-on-dark-muted transition hover:border-white/40 hover:bg-white/16 hover:text-on-dark"
          >
            Refresh
          </button>
        }
      />

      {missingSa ? <SetupCredentialsCallout /> : null}
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-elevated-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            {STATUSES.map((s) => (
              <StatusFilterChip
                key={s}
                label={STATUS_LABELS[s]}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order id, email, Razorpay id..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2 md:max-w-sm"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="max-h-[520px] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-muted/80 font-mono text-[11px] uppercase tracking-wider text-caption-foreground backdrop-blur">
                <tr>
                  <th className="w-[34%] px-3 py-2">Order</th>
                  <th className="w-[26%] px-3 py-2">Status</th>
                  <th className="w-[22%] px-3 py-2">Total</th>
                  <th className="w-[18%] px-3 py-2">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const selected = row.id === activeId;
                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer ${selected ? "bg-primary/10" : "bg-card hover:bg-muted/35"}`}
                        onClick={() => setActiveId(row.id)}
                      >
                        <td className="truncate px-3 py-2.5 font-mono text-xs" title={row.id}>
                          {shortOrderId(row.id)}
                        </td>
                        <td className="px-3 py-2.5">
                          <OrderStatusBadge status={row.status} />
                        </td>
                        <td className="truncate px-3 py-2.5 font-medium">
                          {formatMoney(row.subtotal, row.currency)}
                        </td>
                        <td className="truncate px-3 py-2.5 text-xs text-caption-foreground" title={formatDate(row.createdAtIso)}>
                          {formatDateShort(row.createdAtIso)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
          <h2 className="font-display text-lg font-semibold text-foreground">Order details</h2>
          {!active ? (
            <p className="mt-3 text-sm text-muted-foreground">Select an order to review it.</p>
          ) : (
            <OrderDetailCard
              key={active.id}
              row={active}
              busy={savingId === active.id}
              onUpdate={updateOrder}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function StatusFilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-primary/35 bg-primary/12 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

function OrderDetailCard({
  row,
  busy,
  onUpdate,
}: {
  row: OrderRow;
  busy: boolean;
  onUpdate: (id: string, status: OrderStatus, adminNotes?: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(row.adminNotes ?? "");
  const customerName = getAdminOrderCustomerName(row as AdminOrderRow);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={row.status} />
        <span className="text-xs text-caption-foreground">Placed {formatDate(row.createdAtIso)}</span>
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
        <p>
          <span className="text-caption-foreground">Order ID:</span>{" "}
          <span className="font-mono text-xs">{row.id}</span>
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Customer name:</span> {customerName}
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Email:</span> {row.userEmail || "—"}
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Total:</span> {formatMoney(row.subtotal, row.currency)} (
          {row.lineCount} lines · {row.totalUnits} units)
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Razorpay order:</span>{" "}
          <span className="font-mono text-xs">{row.razorpayOrderId || "—"}</span>
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Razorpay payment:</span>{" "}
          <span className="font-mono text-xs">{row.razorpayPaymentId || "—"}</span>
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Paid at:</span> {formatDate(row.paidAtIso)}
        </p>
        <p className="mt-1">
          <span className="text-caption-foreground">Delivered at:</span> {formatDate(row.deliveredAtIso)}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">Line items</p>
        <ul className="mt-2 max-h-48 space-y-2 overflow-auto rounded-xl border border-border bg-background/60 p-3 text-sm">
          {row.items.map((item) => (
            <li key={item.slug} className="border-b border-border/60 pb-2 last:border-0 last:pb-0">
              <p className="font-medium text-foreground">{item.chemicalName}</p>
              <p className="text-xs text-caption-foreground">
                {item.catalogNumber}
                {item.variantSize ? ` · ${item.variantSize}` : ""} · Qty {item.quantity}
              </p>
              <p className="text-xs font-mono text-foreground">
                {item.lineTotal !== null ? formatMoney(item.lineTotal, row.currency) : item.variantPrice || "Quote"}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">Admin notes</label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
          placeholder="Fulfilment, shipping, or internal follow-up..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void onUpdate(row.id, s, notes)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
              row.status === s
                ? orderStatusBadgeClass(s)
                : "border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            Mark {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <DownloadOrderInvoiceButton row={row as AdminOrderRow} />
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${orderStatusBadgeClass(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateShort(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
