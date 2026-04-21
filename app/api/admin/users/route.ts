import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";

export async function GET(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;
  try {
    const list = await getAdminAuth().listUsers(100);
    const users = list.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      disabled: u.disabled,
      creationTime: u.metadata.creationTime,
      isAdmin: u.customClaims?.isAdmin === true,
    }));
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    isAdmin?: boolean;
  };
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }
  try {
    const record = await getAdminAuth().createUser({
      email,
      password,
      displayName: body.displayName?.trim() || undefined,
    });
    if (body.isAdmin === true) {
      await getAdminAuth().setCustomUserClaims(record.uid, { isAdmin: true });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
