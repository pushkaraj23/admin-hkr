import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { getAdminFirestore } from "@/lib/firebase/admin";

type EnquiryStatus = "new" | "in_progress" | "responded" | "closed" | "spam";

const VALID_STATUSES: EnquiryStatus[] = ["new", "in_progress", "responded", "closed", "spam"];

function normalizeStatus(value: unknown): EnquiryStatus {
  const raw = String(value ?? "").trim() as EnquiryStatus;
  return VALID_STATUSES.includes(raw) ? raw : "new";
}

export async function GET(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  try {
    const url = new URL(req.url);
    const limitValue = Number(url.searchParams.get("limit") ?? "100");
    const statusFilter = url.searchParams.get("status");
    const search = String(url.searchParams.get("search") ?? "").trim().toLowerCase();
    const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(250, limitValue)) : 100;

    const db = getAdminFirestore();
    const baseQuery = statusFilter && VALID_STATUSES.includes(statusFilter as EnquiryStatus)
      ? db.collection("enquiries").where("status", "==", statusFilter)
      : db.collection("enquiries");
    const snap = await baseQuery.orderBy("createdAt", "desc").limit(limit).get();

    const enquiries = snap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
        const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;
        return {
          id: doc.id,
          name: String(data.name ?? ""),
          email: String(data.email ?? ""),
          phone: String(data.phone ?? ""),
          organization: String(data.organization ?? ""),
          reference: String(data.reference ?? ""),
          message: String(data.message ?? ""),
          source: String(data.source ?? "website"),
          status: normalizeStatus(data.status),
          adminNotes: String(data.adminNotes ?? ""),
          createdAtIso: createdAt?.toDate ? createdAt.toDate().toISOString() : String(data.createdAtIso ?? ""),
          updatedAtIso: updatedAt?.toDate ? updatedAt.toDate().toISOString() : "",
        };
      })
      .filter((row) => {
        if (!search) return true;
        const haystack = `${row.name} ${row.email} ${row.phone} ${row.organization} ${row.reference} ${row.message}`.toLowerCase();
        return haystack.includes(search);
      });

    return NextResponse.json({ enquiries, total: snap.size });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  const body = (await req.json()) as { id?: unknown; status?: unknown; adminNotes?: unknown };
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const payload = {
    status: normalizeStatus(body.status),
    adminNotes: String(body.adminNotes ?? "").trim(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: auth.email ?? auth.uid,
  };

  await getAdminFirestore().collection("enquiries").doc(id).set(payload, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await getAdminFirestore().collection("enquiries").doc(id).delete();
  return NextResponse.json({ ok: true });
}
