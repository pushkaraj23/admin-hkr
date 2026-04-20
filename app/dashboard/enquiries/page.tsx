"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";

type EnquiryStatus = "new" | "in_progress" | "responded" | "closed" | "spam";

type EnquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  reference: string;
  message: string;
  source: string;
  status: EnquiryStatus;
  adminNotes: string;
  createdAtIso: string;
  updatedAtIso?: string;
};

const STATUSES: EnquiryStatus[] = ["new", "in_progress", "responded", "closed", "spam"];
const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  in_progress: "In progress",
  responded: "Responded",
  closed: "Closed",
  spam: "Spam",
};

export default function EnquiriesAdminPage() {
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [missingSa, setMissingSa] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "all">("all");
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
      const res = await adminApi<{ enquiries: EnquiryRow[] }>(`/api/admin/enquiries?${params.toString()}`);
      setRows(res.enquiries ?? []);
      if (activeId && !res.enquiries?.some((x) => x.id === activeId)) {
        setActiveId(res.enquiries?.[0]?.id ?? null);
      } else if (!activeId) {
        setActiveId(res.enquiries?.[0]?.id ?? null);
      }
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setRows([]);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load enquiries");
      }
    } finally {
      setLoading(false);
    }
  }, [activeId, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => rows.find((r) => r.id === activeId) ?? null, [activeId, rows]);

  async function updateStatus(id: string, status: EnquiryStatus, adminNotes?: string) {
    setSavingId(id);
    setError(null);
    try {
      await adminApi("/api/admin/enquiries", {
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

  async function remove(id: string) {
    if (!confirm("Delete this enquiry? This cannot be undone.")) return;
    setSavingId(id);
    setError(null);
    try {
      await adminApi(`/api/admin/enquiries?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Enquiries"
        subtitle="Track incoming website enquiries, update their status, and keep internal notes in one place."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-border bg-background/60 px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-tint-primary/20 hover:text-foreground"
          >
            Refresh
          </button>
        }
      />

      {missingSa ? <SetupCredentialsCallout /> : null}
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-elevated-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusFilterChip
              label="All"
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
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
            placeholder="Search name, email, phone, reference..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2 md:max-w-sm"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 font-mono text-[11px] uppercase tracking-wider text-caption-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No enquiries found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const selected = row.id === activeId;
                    return (
                      <tr
                        key={row.id}
                        className={selected ? "bg-primary/10" : "bg-card hover:bg-muted/35"}
                        onClick={() => setActiveId(row.id)}
                      >
                        <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-foreground" title={row.name || "—"}>
                          {row.name || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full border border-border bg-background px-2 py-1 text-xs">
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-caption-foreground">{formatDate(row.createdAtIso)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-elevated-sm">
          <h2 className="font-display text-lg font-semibold text-foreground">Enquiry details</h2>
          {!active ? (
            <p className="mt-3 text-sm text-muted-foreground">Select an enquiry to manage it.</p>
          ) : (
            <EnquiryDetailCard
              key={active.id}
              row={active}
              busy={savingId === active.id}
              onUpdate={updateStatus}
              onDelete={remove}
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

function EnquiryDetailCard({
  row,
  busy,
  onUpdate,
  onDelete,
}: {
  row: EnquiryRow;
  busy: boolean;
  onUpdate: (id: string, status: EnquiryStatus, adminNotes?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(row.adminNotes ?? "");

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
        <p><span className="text-caption-foreground">Name:</span> {row.name || "—"}</p>
        <p className="mt-1"><span className="text-caption-foreground">Email:</span> {row.email || "—"}</p>
        <p className="mt-1"><span className="text-caption-foreground">Phone:</span> {row.phone || "—"}</p>
        <p className="mt-1"><span className="text-caption-foreground">Organization:</span> {row.organization || "—"}</p>
        <p className="mt-1"><span className="text-caption-foreground">Reference:</span> {row.reference || "—"}</p>
        <p className="mt-1"><span className="text-caption-foreground">Source:</span> {row.source || "website"}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">Message</p>
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-4 text-sm text-foreground">
          {row.message || "—"}
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">Admin notes</label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
          placeholder="Capture follow-up notes or call outcomes..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void onUpdate(row.id, s, notes)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${row.status === s ? "border-primary/40 bg-primary/12 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"} disabled:opacity-60`}
          >
            Mark {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-caption-foreground">Received {formatDate(row.createdAtIso)}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete(row.id)}
          className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger transition hover:bg-danger/15 disabled:opacity-60"
        >
          Delete enquiry
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}
