import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { slugFromName } from "@/lib/admin/slug";

export async function GET(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("subcategories").get();
    const subcategories = snap.docs.map((d) => ({ slug: d.id, ...d.data() })) as {
      slug: string;
      categorySlug?: string;
      order?: number;
      name?: string;
    }[];
    subcategories.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        String(a.categorySlug ?? "").localeCompare(String(b.categorySlug ?? "")) ||
        String(a.name ?? "").localeCompare(String(b.name ?? "")),
    );
    return NextResponse.json({ subcategories });
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
  const categorySlug = String(body.categorySlug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  if (!categorySlug) {
    return NextResponse.json({ error: "categorySlug required" }, { status: 400 });
  }
  const payload = {
    slug,
    categorySlug,
    name: String(body.name ?? ""),
    description: body.description ? String(body.description) : "",
    order: typeof body.order === "number" ? body.order : 0,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await getAdminFirestore().collection("subcategories").doc(slug).set(payload, { merge: true });
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
    const categorySlug = String(row.categorySlug ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (!categorySlug || !name) continue;

    const slug = slugFromName(name);
    if (!slug) continue;

    const payload = {
      slug,
      categorySlug,
      name,
      description: row.description ? String(row.description) : "",
      order: typeof row.order === "number" ? row.order : 0,
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(db.collection("subcategories").doc(slug), payload, { merge: true });
    imported += 1;
  }

  if (imported === 0) {
    return NextResponse.json({ error: "No valid rows (categorySlug and name are required)." }, { status: 400 });
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
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  await getAdminFirestore().collection("subcategories").doc(slug).delete();
  return NextResponse.json({ ok: true });
}
