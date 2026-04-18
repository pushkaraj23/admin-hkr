import * as admin from "firebase-admin";

let _ready = false;

export function ensureAdminApp(): void {
  if (_ready) {
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    const err = new Error("MISSING_SERVICE_ACCOUNT");
    (err as Error & { code?: string }).code = "MISSING_SERVICE_ACCOUNT";
    throw err;
  }
  const parsed = JSON.parse(raw) as Record<string, string | undefined>;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(parsed as admin.ServiceAccount),
    });
  }
  _ready = true;
}

export function getAdminFirestore() {
  ensureAdminApp();
  return admin.firestore();
}

export function getAdminAuth() {
  ensureAdminApp();
  return admin.auth();
}
