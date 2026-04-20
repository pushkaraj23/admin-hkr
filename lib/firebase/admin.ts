import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

let _ready = false;

function resolveCredentialFilePath(): string | null {
  const p =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!p) {
    return null;
  }
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

/** True if inline JSON is set, or a credential file path exists on disk. */
export function isServiceAccountConfigured(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    return true;
  }
  const filePath = resolveCredentialFilePath();
  return Boolean(filePath && fs.existsSync(filePath));
}

function loadServiceAccount(): Record<string, string | undefined> {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    return JSON.parse(inline) as Record<string, string | undefined>;
  }
  const filePath = resolveCredentialFilePath();
  if (filePath && fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as Record<string, string | undefined>;
  }
  const err = new Error("MISSING_SERVICE_ACCOUNT");
  (err as Error & { code?: string }).code = "MISSING_SERVICE_ACCOUNT";
  throw err;
}

export function ensureAdminApp(): void {
  if (_ready) {
    return;
  }
  const parsed = loadServiceAccount();
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
