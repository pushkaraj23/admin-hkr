import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { productPayloadFromBody } from "@/lib/admin/product-payload";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { deleteImagesForProductSlugs, replaceProductImageIfNeeded } from "@/lib/admin/catalog-images";

export async function GET(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("products").get();
    const products = snap.docs.map((d) => ({ ...d.data(), slug: d.id })) as {
      slug: string;
      catalogNumber?: string;
    }[];
    products.sort((a, b) => String(a.catalogNumber ?? "").localeCompare(String(b.catalogNumber ?? "")));
    return NextResponse.json({ products });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;
  const body = (await req.json()) as Record<string, unknown>;
  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const payloadBody = productPayloadFromBody(body, slug);
  await replaceProductImageIfNeeded(slug, String(payloadBody.imageUrl ?? ""));

  const payload = {
    ...payloadBody,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await getAdminFirestore().collection("products").doc(slug).set(payload, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  const body = (await req.json()) as { rows?: Array<Record<string, unknown>> };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Too many rows. Max 1000 per import." }, { status: 400 });
  }

  const db = getAdminFirestore();
  const batch = db.batch();
  let imported = 0;

  for (const row of rows) {
    const slug = String(row.slug ?? "").trim();
    const catalogNumber = String(row.catalogNumber ?? "").trim();
    const categorySlug = String(row.categorySlug ?? "").trim();
    const chemicalName = String(row.chemicalName ?? "").trim();
    if (!slug || !catalogNumber || !categorySlug || !chemicalName) continue;

    const payload = {
      ...productPayloadFromBody({ ...row, slug, catalogNumber, categorySlug, chemicalName }, slug),
      updatedAt: FieldValue.serverTimestamp(),
    };

    batch.set(db.collection("products").doc(slug), payload, { merge: true });
    imported += 1;
  }

  if (imported === 0) {
    return NextResponse.json(
      { error: "No valid rows (slug, catalogNumber, categorySlug, chemicalName required)." },
      { status: 400 },
    );
  }

  await batch.commit();
  return NextResponse.json({ ok: true, imported });
}

export async function DELETE(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  const url = new URL(req.url);
  const slugParam = url.searchParams.get("slug");

  let slugs: string[] = [];
  if (slugParam) {
    slugs = [slugParam.trim()];
  } else {
    try {
      const body = (await req.json()) as { slugs?: unknown };
      if (Array.isArray(body.slugs)) {
        slugs = body.slugs.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      /* no JSON body — bulk delete expects { slugs: string[] } */
    }
  }

  slugs = [...new Set(slugs)];
  if (slugs.length === 0) {
    return NextResponse.json({ error: "slug or slugs required" }, { status: 400 });
  }
  if (slugs.length > 500) {
    return NextResponse.json({ error: "Too many products. Max 500 per bulk delete." }, { status: 400 });
  }

  const db = getAdminFirestore();
  await deleteImagesForProductSlugs(slugs);
  const batch = db.batch();
  for (const slug of slugs) {
    batch.delete(db.collection("products").doc(slug));
  }
  await batch.commit();
  return NextResponse.json({ ok: true, deleted: slugs.length });
}
