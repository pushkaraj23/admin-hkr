import { isServiceAccountConfigured } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

/** Public: lets the dashboard show setup hints without calling protected APIs. */
export async function GET() {
  const serviceAccountConfigured = isServiceAccountConfigured();
  const adminEmailsConfigured = Boolean(process.env.ADMIN_EMAILS?.trim());
  return NextResponse.json({
    serviceAccountConfigured,
    adminEmailsConfigured,
    production: process.env.NODE_ENV === "production",
  });
}
