import { randomUUID } from "crypto";
import { getAdminStorageBucket, getStorageBucketName } from "@/lib/firebase/admin";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export type CatalogImageFolder = "categories" | "products";

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 80) || "image";
}

export function buildCatalogImagePath(folder: CatalogImageFolder, entitySlug: string, fileName: string): string {
  const slug = entitySlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "draft";
  const safeName = sanitizeStorageFileName(fileName);
  return `catalog/${folder}/${slug}/${Date.now()}-${safeName}`;
}

export function buildFirebaseDownloadUrl(bucket: string, storagePath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

export function parseFirebaseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname === "firebasestorage.googleapis.com") {
      const match = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
    }
    if (u.hostname === "storage.googleapis.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      return { bucket: parts[0], path: parts.slice(1).join("/") };
    }
    return null;
  } catch {
    return null;
  }
}

export function isManagedStorageUrl(url: string): boolean {
  const parsed = parseFirebaseStorageUrl(url);
  if (!parsed) return false;
  const bucket = getStorageBucketName();
  return parsed.bucket === bucket && parsed.path.startsWith("catalog/");
}

export async function uploadCatalogImage(params: {
  folder: CatalogImageFolder;
  entitySlug: string;
  fileName: string;
  mime: string;
  buffer: Buffer;
}): Promise<{ url: string; storagePath: string }> {
  if (!isAllowedImageMime(params.mime)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed.");
  }
  if (params.buffer.length > MAX_BYTES) {
    throw new Error("Image must be 8 MB or smaller.");
  }

  const bucket = getAdminStorageBucket();
  const bucketName = getStorageBucketName();
  const storagePath = buildCatalogImagePath(params.folder, params.entitySlug, params.fileName);
  const token = randomUUID();
  const file = bucket.file(storagePath);

  await file.save(params.buffer, {
    resumable: false,
    metadata: {
      contentType: params.mime,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return {
    url: buildFirebaseDownloadUrl(bucketName, storagePath, token),
    storagePath,
  };
}

export async function deleteStorageFileByUrl(url: string): Promise<boolean> {
  const parsed = parseFirebaseStorageUrl(url);
  if (!parsed) return false;
  if (!isManagedStorageUrl(url)) return false;

  const bucket = getAdminStorageBucket();
  if (parsed.bucket !== bucket.name) return false;

  try {
    await bucket.file(parsed.path).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

export async function deleteStorageFilesByUrls(urls: Array<string | undefined | null>): Promise<void> {
  const unique = [...new Set(urls.map((u) => String(u ?? "").trim()).filter(Boolean))];
  await Promise.all(unique.map((url) => deleteStorageFileByUrl(url)));
}
