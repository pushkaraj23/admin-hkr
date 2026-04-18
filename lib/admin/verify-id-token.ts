import { createRemoteJWKSet, jwtVerify } from "jose";
import { firebaseBrowserConfig } from "@/lib/firebase/config";

/** JWKS for Firebase Auth ID tokens (no service account required). */
const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/**
 * Verifies a Firebase ID token using Google's public keys.
 * Use when Firebase Admin SDK is not configured (no service account).
 */
export async function verifyFirebaseIdTokenPublic(idToken: string): Promise<{ uid: string; email?: string }> {
  const projectId = firebaseBrowserConfig.projectId;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");
  }

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    clockTolerance: 60,
  });

  const uid = payload.sub;
  if (!uid) {
    throw new Error("Invalid token payload");
  }

  const email = typeof payload.email === "string" ? payload.email : undefined;
  return { uid, email };
}
