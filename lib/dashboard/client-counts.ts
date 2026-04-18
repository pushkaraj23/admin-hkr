"use client";

import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

/** Direct Firestore reads (public rules) — works without the service account. */
export async function fetchCatalogDocumentCounts(): Promise<{ categories: number; products: number }> {
  const db = getFirebaseDb();
  const [cats, prods] = await Promise.all([
    getDocs(collection(db, "categories")),
    getDocs(collection(db, "products")),
  ]);
  return { categories: cats.size, products: prods.size };
}
