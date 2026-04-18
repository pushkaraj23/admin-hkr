import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/lib/firebase/admin";
import { verifyFirebaseIdTokenPublic } from "@/lib/admin/verify-id-token";

function jsonError(message: string, status: number, code?: string) {
  return new Response(JSON.stringify(code ? { error: message, code } : { error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export type AdminAuthOk = { ok: true; uid: string; email: string | undefined };
export type AdminAuthFail = { ok: false; response: Response };

export async function requireAdminRequest(req: Request): Promise<AdminAuthOk | AdminAuthFail> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { ok: false, response: jsonError("Missing Authorization bearer token", 401) };
  }

  let decoded: { uid: string; email?: string };

  let useAdminSdk = false;
  try {
    ensureAdminApp();
    useAdminSdk = true;
  } catch {
    useAdminSdk = false;
  }

  if (useAdminSdk) {
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      return { ok: false, response: jsonError("Invalid or expired token", 401) };
    }
  } else {
    try {
      decoded = await verifyFirebaseIdTokenPublic(token);
    } catch {
      return { ok: false, response: jsonError("Invalid or expired token", 401) };
    }
  }

  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = decoded.email?.toLowerCase();

  if (allow.length > 0) {
    if (!email || !allow.includes(email)) {
      return { ok: false, response: jsonError("Email is not in ADMIN_EMAILS allowlist", 403) };
    }
  } else if (process.env.NODE_ENV === "production") {
    return { ok: false, response: jsonError("Set ADMIN_EMAILS in production", 403) };
  }

  return { ok: true, uid: decoded.uid, email: decoded.email };
}
