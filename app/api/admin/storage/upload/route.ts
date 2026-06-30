import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import {
  isAllowedImageMime,
  uploadCatalogImage,
  type CatalogImageFolder,
} from "@/lib/admin/storage";

export async function POST(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "").trim() as CatalogImageFolder;
    const entitySlug = String(form.get("slug") ?? "draft").trim();

    if (folder !== "categories" && folder !== "products") {
      return NextResponse.json({ error: "folder must be categories or products" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (!isAllowedImageMime(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadCatalogImage({
      folder,
      entitySlug,
      fileName: file.name || "image.jpg",
      mime: file.type,
      buffer,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
