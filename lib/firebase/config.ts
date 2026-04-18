/**
 * Public Firebase web config (safe in the browser; lock down with App Check + auth domains).
 *
 * Use either:
 * - `NEXT_PUBLIC_FIREBASE_JSON` — single line: paste the `firebaseConfig` object from Firebase Console as JSON, or
 * - Individual `NEXT_PUBLIC_FIREBASE_*` variables (see `.env.example`).
 *
 * After changing env files, restart `npm run dev` so Next.js picks them up.
 */

function asNonEmptyString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim().length > 0) {
    return v.trim();
  }
  return undefined;
}

function parseJsonConfig():
  | {
      apiKey?: string;
      authDomain?: string;
      projectId?: string;
      storageBucket?: string;
      messagingSenderId?: string;
      appId?: string;
      measurementId?: string;
    }
  | undefined {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_JSON;
  if (!raw?.trim()) {
    return undefined;
  }
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      apiKey: asNonEmptyString(o.apiKey),
      authDomain: asNonEmptyString(o.authDomain),
      projectId: asNonEmptyString(o.projectId),
      storageBucket: asNonEmptyString(o.storageBucket),
      messagingSenderId: asNonEmptyString(o.messagingSenderId),
      appId: asNonEmptyString(o.appId),
      measurementId: asNonEmptyString(o.measurementId),
    };
  } catch {
    return undefined;
  }
}

const fromJson = parseJsonConfig();

export const firebaseBrowserConfig = {
  apiKey: fromJson?.apiKey ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: fromJson?.authDomain ?? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: fromJson?.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: fromJson?.storageBucket ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: fromJson?.messagingSenderId ?? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: fromJson?.appId ?? process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: fromJson?.measurementId ?? process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? undefined,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseBrowserConfig.apiKey &&
      firebaseBrowserConfig.authDomain &&
      firebaseBrowserConfig.projectId &&
      firebaseBrowserConfig.appId,
  );
}

/** For UI hints in development when auth is not wired yet */
export function missingFirebasePublicEnvHints(): string[] {
  const missing: string[] = [];
  if (!firebaseBrowserConfig.apiKey) {
    missing.push("apiKey (NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_JSON)");
  }
  if (!firebaseBrowserConfig.authDomain) {
    missing.push("authDomain");
  }
  if (!firebaseBrowserConfig.projectId) {
    missing.push("projectId");
  }
  if (!firebaseBrowserConfig.appId) {
    missing.push("appId");
  }
  return missing;
}
