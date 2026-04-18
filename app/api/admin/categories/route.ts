import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";

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
  const payload = {
    slug,
    name: String(body.name ?? ""),
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
  await getAdminFirestore().collection("categories").doc(slug).delete();
  return NextResponse.json({ ok: true });
}
