import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { deleteStorageFileByUrl } from "@/lib/admin/storage";

export async function DELETE(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  const url = new URL(req.url).searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "url query required" }, { status: 400 });
  }

  try {
    const deleted = await deleteStorageFileByUrl(url);
    if (!deleted) {
      return NextResponse.json({ error: "Image not found or not managed storage" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
