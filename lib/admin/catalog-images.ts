import { deleteStorageFilesByUrls } from "@/lib/admin/storage";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function collectCategoryImageUrls(slugs: string[]): Promise<string[]> {
  const db = getAdminFirestore();
  const urls: string[] = [];
  for (const slug of slugs) {
    const snap = await db.collection("categories").doc(slug).get();
    if (snap.exists) {
      const imageUrl = String((snap.data() as { imageUrl?: string })?.imageUrl ?? "").trim();
      if (imageUrl) urls.push(imageUrl);
    }
  }
  return urls;
}

export async function collectProductImageUrls(slugs: string[]): Promise<string[]> {
  const db = getAdminFirestore();
  const urls: string[] = [];
  for (const slug of slugs) {
    const snap = await db.collection("products").doc(slug).get();
    if (snap.exists) {
      const imageUrl = String((snap.data() as { imageUrl?: string })?.imageUrl ?? "").trim();
      if (imageUrl) urls.push(imageUrl);
    }
  }
  return urls;
}

export async function deleteImagesForCategorySlugs(slugs: string[]): Promise<void> {
  const urls = await collectCategoryImageUrls(slugs);
  await deleteStorageFilesByUrls(urls);
}

export async function deleteImagesForProductSlugs(slugs: string[]): Promise<void> {
  const urls = await collectProductImageUrls(slugs);
  await deleteStorageFilesByUrls(urls);
}

export async function replaceCategoryImageIfNeeded(slug: string, nextImageUrl: string): Promise<void> {
  const db = getAdminFirestore();
  const snap = await db.collection("categories").doc(slug).get();
  if (!snap.exists) return;
  const prev = String((snap.data() as { imageUrl?: string })?.imageUrl ?? "").trim();
  const next = nextImageUrl.trim();
  if (prev && prev !== next) {
    await deleteStorageFilesByUrls([prev]);
  }
}

export async function replaceProductImageIfNeeded(slug: string, nextImageUrl: string): Promise<void> {
  const db = getAdminFirestore();
  const snap = await db.collection("products").doc(slug).get();
  if (!snap.exists) return;
  const prev = String((snap.data() as { imageUrl?: string })?.imageUrl ?? "").trim();
  const next = nextImageUrl.trim();
  if (prev && prev !== next) {
    await deleteStorageFilesByUrls([prev]);
  }
}
