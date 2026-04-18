import { NextResponse } from "next/server";

/** Public: lets the dashboard show setup hints without calling protected APIs. */
export async function GET() {
  const serviceAccountConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const adminEmailsConfigured = Boolean(process.env.ADMIN_EMAILS?.trim());
  return NextResponse.json({
    serviceAccountConfigured,
    adminEmailsConfigured,
    production: process.env.NODE_ENV === "production",
  });
}
