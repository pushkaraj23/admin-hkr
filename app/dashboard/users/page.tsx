"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { useAuth } from "@/components/providers/AuthProvider";
import { AdminApiError, adminApi, refreshAdminIdToken } from "@/lib/admin/client-fetch";

type Row = {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  creationTime?: string;
  isAdmin: boolean;
};

export default function UsersAdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAdminCreate, setIsAdminCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [missingSa, setMissingSa] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingSa(false);
    try {
      const res = await adminApi<{ users: Row[] }>("/api/admin/users");
      setUsers(res.users ?? []);
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
        setUsers([]);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await adminApi("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
          isAdmin: isAdminCreate,
        }),
      });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setIsAdminCreate(false);
      await load();
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "MISSING_SERVICE_ACCOUNT") {
        setMissingSa(true);
      }
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function setUserAdmin(uid: string, isAdmin: boolean) {
    setUpdatingUid(uid);
    setError(null);
    try {
      await adminApi(`/api/admin/users/${encodeURIComponent(uid)}`, {
        method: "PATCH",
        body: JSON.stringify({ isAdmin }),
      });
      if (currentUser?.uid === uid) {
        await refreshAdminIdToken();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingUid(null);
    }
  }

  async function deleteUser(row: Row) {
    if (!row.uid) return;
    const label = row.email ?? row.displayName ?? row.uid;
    const confirmed = window.confirm(`Delete user "${label}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingUid(row.uid);
    setError(null);
    try {
      await adminApi(`/api/admin/users/${encodeURIComponent(row.uid)}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingUid(null);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle="Manage access for internal team members who can use this admin workspace."
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
        <p className="rounded-xl border border-danger/30 bg-tint-danger/40 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-elevated-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Create user</h2>
        <form onSubmit={createUser} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={isAdminCreate}
              onChange={(e) => setIsAdminCreate(e.target.checked)}
              className="size-4 rounded border-input text-primary"
            />
            <span className="text-sm text-foreground">
              <span className="font-semibold">Admin</span>
              <span className="text-muted-foreground"> — can use this admin panel (stored as Firebase custom claim)</span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-cta-gradient-diagonal px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-primary-glow disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Current users</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New sign-ins pick up Admin immediately. If you change Admin for someone already signed in, they should refresh the
          page or sign out and back in.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-muted/50 font-mono text-[11px] uppercase tracking-wider text-caption-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users returned.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const busy = updatingUid === u.uid;
                  const isSelf = currentUser?.uid === u.uid;
                  const deleting = deletingUid === u.uid;
                  return (
                    <tr key={u.uid} className="bg-card">
                      <td className="px-4 py-3 text-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.displayName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={u.isAdmin}
                          disabled={busy || u.disabled || (isSelf && u.isAdmin)}
                          title={
                            isSelf && u.isAdmin
                              ? "Another admin must remove Admin from your account"
                              : undefined
                          }
                          onChange={(e) => void setUserAdmin(u.uid, e.target.checked)}
                          className="size-4 rounded border-input text-primary disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-caption-foreground">{u.uid}</td>
                      <td className="px-4 py-3 text-caption-foreground">{u.creationTime ?? "—"}</td>
                      <td className="px-4 py-3">{u.disabled ? "Disabled" : "Active"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void deleteUser(u)}
                          disabled={busy || deleting || isSelf}
                          title={isSelf ? "You cannot delete your own account" : undefined}
                          className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-tint-danger/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deleting ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
