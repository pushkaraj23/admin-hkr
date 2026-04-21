import { isServiceAccountConfigured } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

/** Public: lets the dashboard show setup hints without calling protected APIs. */
export async function GET() {
  const serviceAccountConfigured = isServiceAccountConfigured();
  return NextResponse.json({
    serviceAccountConfigured,
    production: process.env.NODE_ENV === "production",
  });
}
