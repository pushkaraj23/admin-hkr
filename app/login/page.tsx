"use client";

import Image from "next/image";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#020A63] px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 90% 58% at 100% -8%, color-mix(in srgb, var(--primary) 32%, transparent), transparent 52%), radial-gradient(ellipse 72% 48% at -5% 92%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 50%), linear-gradient(165deg, #020A63 0%, #0a1f6e 38%, #06145a 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[12%] top-[14%] h-10 w-10 animate-orbit-slow rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), color-mix(in srgb, var(--accent) 35%, transparent) 55%, transparent)",
          boxShadow: "0 6px 20px -4px rgba(43,196,138,0.35)",
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/20 bg-card/98 p-8 shadow-[0_22px_60px_-20px_rgba(2,10,99,0.55)] backdrop-blur-md">
        <div className="mb-4 flex items-center justify-center">
          <Image
            src="/hkr_logo.png"
            alt="HKR Biotech"
            width={180}
            height={44}
            className="h-11 w-auto rounded-lg border border-border/80 bg-white px-2 py-1 object-contain shadow-sm"
            priority
          />
        </div>
        <h1 className="text-center font-display text-2xl font-bold text-foreground">Admin login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a Firebase account that has <span className="font-medium text-foreground">Admin</span> enabled
          (set on the Users page), or listed in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">ADMIN_EMAILS</code> for bootstrap.
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
          <Link href="/dashboard" className="font-medium text-primary-deep hover:underline">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
