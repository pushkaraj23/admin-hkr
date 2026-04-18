"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const configured = isFirebaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Firebase is not configured. Copy NEXT_PUBLIC_FIREBASE_* from the website .env.local.");
      return;
    }
    setPending(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -15%, color-mix(in srgb, var(--primary) 28%, transparent), transparent), radial-gradient(ellipse 70% 45% at 100% 100%, color-mix(in srgb, var(--secondary) 14%, transparent), transparent)",
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-b from-card to-tint-primary/10 p-8 shadow-elevated-lg">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Admin</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">HKR control panel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a Firebase account allowed in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">ADMIN_EMAILS</code>.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-caption-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring/30 transition focus:ring-2"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-caption-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring/30 transition focus:ring-2"
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-danger/30 bg-tint-danger/40 px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "w-full rounded-full bg-cta-gradient-diagonal py-3 text-sm font-semibold text-primary-foreground shadow-primary-glow transition hover:-translate-y-0.5 disabled:opacity-60",
            )}
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-caption-foreground">
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
