"use client";

import { useCallback, useEffect, useState } from "react";
import { SetupCredentialsCallout } from "@/components/admin/SetupCredentialsCallout";
import { AdminApiError, adminApi } from "@/lib/admin/client-fetch";

type Row = {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  creationTime?: string;
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [missingSa, setMissingSa] = useState(false);

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
        }),
      });
      setEmail("");
      setPassword("");
      setDisplayName("");
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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Users</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Lists Firebase Authentication users. Creating users requires the service account (
          <code className="rounded bg-muted px-1 font-mono text-xs">FIREBASE_SERVICE_ACCOUNT_JSON</code>).
        </p>
      </div>

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
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 font-mono text-[11px] uppercase tracking-wider text-caption-foreground">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users returned.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="bg-card">
                    <td className="px-4 py-3 text-foreground">{u.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.displayName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-caption-foreground">{u.uid}</td>
                    <td className="px-4 py-3 text-caption-foreground">{u.creationTime ?? "—"}</td>
                    <td className="px-4 py-3">{u.disabled ? "Disabled" : "Active"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
