import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { deleteImagesForCategorySlugs, replaceCategoryImageIfNeeded } from "@/lib/admin/catalog-images";
import { slugFromName } from "@/lib/admin/slug";

export async function GET(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("categories").get();
    const categories = snap.docs.map((d) => ({ slug: d.id, ...d.data() })) as {
      slug: string;
      order?: number;
      name?: string;
    }[];
    categories.sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name ?? "").localeCompare(String(b.name ?? "")),
    );
    return NextResponse.json({ categories });
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
  const highlights = Array.isArray(body.highlights) ? body.highlights.map(String) : [];
  const imageUrl = body.imageUrl ? String(body.imageUrl) : "";
  await replaceCategoryImageIfNeeded(slug, imageUrl);
  const payload = {
    slug,
    name: String(body.name ?? ""),
    imageUrl,
    tagline: String(body.tagline ?? ""),
    description: String(body.description ?? ""),
    overview: String(body.overview ?? ""),
    highlights,
    order: typeof body.order === "number" ? body.order : 0,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await getAdminFirestore().collection("categories").doc(slug).set(payload, { merge: true });
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
    const name = String(row.name ?? "").trim();
    if (!name) continue;

    const slug = slugFromName(name);
    if (!slug) continue;

    const payload = {
      slug,
      name,
      imageUrl: "",
      tagline: String(row.tagline ?? ""),
      description: String(row.description ?? ""),
      overview: String(row.overview ?? ""),
      highlights: Array.isArray(row.highlights) ? row.highlights.map(String) : [],
      order: typeof row.order === "number" ? row.order : 0,
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(db.collection("categories").doc(slug), payload, { merge: true });
    imported += 1;
  }

  if (imported === 0) {
    return NextResponse.json({ error: "No valid rows (name is required)." }, { status: 400 });
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
      /* bulk delete expects { slugs: string[] } */
    }
  }

  slugs = [...new Set(slugs)];
  if (slugs.length === 0) {
    return NextResponse.json({ error: "slug or slugs required" }, { status: 400 });
  }
  if (slugs.length > 500) {
    return NextResponse.json({ error: "Too many categories. Max 500 per bulk delete." }, { status: 400 });
  }

  const db = getAdminFirestore();
  await deleteImagesForCategorySlugs(slugs);
  const batch = db.batch();
  for (const slug of slugs) {
    batch.delete(db.collection("categories").doc(slug));
  }
  await batch.commit();
  return NextResponse.json({ ok: true, deleted: slugs.length });
}
