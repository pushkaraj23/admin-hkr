"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function getAdminIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const u = auth.currentUser;
  if (!u) return null;
  return u.getIdToken();
}

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAdminIdToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = (data as { error?: string; code?: string })?.error ?? res.statusText;
    const code = (data as { code?: string })?.code;
    throw new AdminApiError(err, res.status, code);
  }
  return data as T;
}
