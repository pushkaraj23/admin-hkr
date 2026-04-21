import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";

export async function PATCH(req: Request, context: { params: Promise<{ uid: string }> }) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  const { uid } = await context.params;
  if (!uid?.trim()) {
    return NextResponse.json({ error: "uid required" }, { status: 400 });
  }

  const body = (await req.json()) as { isAdmin?: boolean };
  if (typeof body.isAdmin !== "boolean") {
    return NextResponse.json({ error: "isAdmin boolean required" }, { status: 400 });
  }

  if (auth.ok && auth.uid === uid && !body.isAdmin) {
    return NextResponse.json(
      { error: "Another admin must remove Admin from your account." },
      { status: 400 },
    );
  }

  try {
    const user = await getAdminAuth().getUser(uid);
    const nextClaims = { ...(user.customClaims ?? {}), isAdmin: body.isAdmin };
    await getAdminAuth().setCustomUserClaims(uid, nextClaims);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
