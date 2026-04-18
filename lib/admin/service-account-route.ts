import { ensureAdminApp } from "@/lib/firebase/admin";

export function serviceAccountUnavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      error:
        "Add FIREBASE_SERVICE_ACCOUNT_JSON to admin-hkr/.env.local — Firebase Console → Project settings → Service accounts → Generate new private key (paste JSON as one line).",
      code: "MISSING_SERVICE_ACCOUNT",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}

/** Use for API routes that call Firestore or Auth Admin. Returns a 503 Response if the service account is missing. */
export function assertServiceAccount(): Response | null {
  try {
    ensureAdminApp();
    return null;
  } catch {
    return serviceAccountUnavailableResponse();
  }
}
