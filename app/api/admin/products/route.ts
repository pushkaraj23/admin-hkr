import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";

const AVAIL = ["In stock", "Made to order", "Limited lots", "Quote required"] as const;

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

  const availabilityRaw = String(body.availability ?? "Quote required");
  const availability = AVAIL.includes(availabilityRaw as (typeof AVAIL)[number])
    ? availabilityRaw
    : "Quote required";

  const payload = {
    id: String(body.id ?? slug),
    slug,
    imageUrl: body.imageUrl ? String(body.imageUrl) : "",
    catalogNumber: String(body.catalogNumber ?? ""),
    categorySlug: String(body.categorySlug ?? ""),
    subcategorySlug: body.subcategorySlug ? String(body.subcategorySlug) : "",
    chemicalName: String(body.chemicalName ?? ""),
    casNumber: String(body.casNumber ?? ""),
    molecularFormula: String(body.molecularFormula ?? ""),
    molecularWeight: String(body.molecularWeight ?? ""),
    purity: String(body.purity ?? ""),
    appearance: String(body.appearance ?? ""),
    shortDescription: String(body.shortDescription ?? ""),
    detailedDescription: String(body.detailedDescription ?? ""),
    applications: Array.isArray(body.applications) ? body.applications.map(String) : [],
    storageConditions: String(body.storageConditions ?? ""),
    packSizes: Array.isArray(body.packSizes) ? body.packSizes.map(String) : [],
    availability,
    datasheetUrl: body.datasheetUrl ? String(body.datasheetUrl) : "",
    coaAvailable: Boolean(body.coaAvailable),
    sdsAvailable: Boolean(body.sdsAvailable),
    relatedSlugs: Array.isArray(body.relatedSlugs) ? body.relatedSlugs.map(String) : [],
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

    const availabilityRaw = String(row.availability ?? "Quote required");
    const availability = AVAIL.includes(availabilityRaw as (typeof AVAIL)[number])
      ? availabilityRaw
      : "Quote required";

    const payload = {
      id: String(row.id ?? slug),
      slug,
      imageUrl: row.imageUrl ? String(row.imageUrl) : "",
      catalogNumber,
      categorySlug,
      subcategorySlug: row.subcategorySlug ? String(row.subcategorySlug) : "",
      chemicalName,
      casNumber: String(row.casNumber ?? ""),
      molecularFormula: String(row.molecularFormula ?? ""),
      molecularWeight: String(row.molecularWeight ?? ""),
      purity: String(row.purity ?? ""),
      appearance: String(row.appearance ?? ""),
      shortDescription: String(row.shortDescription ?? ""),
      detailedDescription: String(row.detailedDescription ?? ""),
      applications: Array.isArray(row.applications) ? row.applications.map(String) : [],
      storageConditions: String(row.storageConditions ?? ""),
      packSizes: Array.isArray(row.packSizes) ? row.packSizes.map(String) : [],
      availability,
      datasheetUrl: row.datasheetUrl ? String(row.datasheetUrl) : "",
      coaAvailable: Boolean(row.coaAvailable),
      sdsAvailable: Boolean(row.sdsAvailable),
      relatedSlugs: Array.isArray(row.relatedSlugs) ? row.relatedSlugs.map(String) : [],
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
  const batch = db.batch();
  for (const slug of slugs) {
    batch.delete(db.collection("products").doc(slug));
  }
  await batch.commit();
  return NextResponse.json({ ok: true, deleted: slugs.length });
}
