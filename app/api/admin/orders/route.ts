import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { getAdminFirestore } from "@/lib/firebase/admin";

type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

const VALID_STATUSES: OrderStatus[] = ["pending", "paid", "failed", "cancelled"];

function normalizeStatus(value: unknown): OrderStatus {
  const raw = String(value ?? "").trim() as OrderStatus;
  return VALID_STATUSES.includes(raw) ? raw : "pending";
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
    const baseQuery =
      statusFilter && VALID_STATUSES.includes(statusFilter as OrderStatus)
        ? db.collection("orders").where("status", "==", statusFilter)
        : db.collection("orders");

    const snap = await baseQuery.orderBy("createdAt", "desc").limit(limit).get();

    const orders = snap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
        const paidAt = data.paidAtIso as string | undefined;
        const items = Array.isArray(data.items) ? data.items : [];
        return {
          id: doc.id,
          userId: String(data.userId ?? ""),
          userEmail: String(data.userEmail ?? ""),
          status: normalizeStatus(data.status),
          lineCount: Number(data.lineCount ?? items.length),
          totalUnits: Number(data.totalUnits ?? 0),
          subtotal: Number(data.subtotal ?? 0),
          currency: String(data.currency ?? "INR"),
          amountPaise: Number(data.amountPaise ?? 0),
          razorpayOrderId: String(data.razorpayOrderId ?? ""),
          razorpayPaymentId: String(data.razorpayPaymentId ?? ""),
          items,
          adminNotes: String(data.adminNotes ?? ""),
          createdAtIso: createdAt?.toDate
            ? createdAt.toDate().toISOString()
            : String(data.createdAtIso ?? ""),
          paidAtIso: paidAt ?? "",
        };
      })
      .filter((row) => {
        if (!search) return true;
        const haystack = `${row.id} ${row.userEmail} ${row.razorpayOrderId} ${row.razorpayPaymentId}`.toLowerCase();
        return haystack.includes(search);
      });

    return NextResponse.json({ orders, total: snap.size });
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

  await getAdminFirestore().collection("orders").doc(id).set(payload, { merge: true });
  return NextResponse.json({ ok: true });
}
