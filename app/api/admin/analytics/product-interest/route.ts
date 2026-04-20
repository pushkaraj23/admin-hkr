import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/auth-route";
import { assertServiceAccount } from "@/lib/admin/service-account-route";
import { getAdminFirestore } from "@/lib/firebase/admin";

type AggregateRow = {
  slug: string;
  categorySlug: string;
  chemicalName: string;
  catalogNumber: string;
  score: number;
  totalEvents: number;
  viewFromList: number;
  viewDetail: number;
  wishlistAdds: number;
  cartAdds: number;
  enquirySubmits: number;
  lastEventAtIso: string;
};

function getIsoDayBefore(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const auth = await requireAdminRequest(req);
  if (!auth.ok) return auth.response;
  const sa = assertServiceAccount();
  if (sa) return sa;

  try {
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") ?? "30")));
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? "12")));
    const fromDay = getIsoDayBefore(days);

    const snap = await getAdminFirestore()
      .collection("analytics_product_interest")
      .where("day", ">=", fromDay)
      .get();

    const map = new Map<string, AggregateRow>();
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const slug = String(data.slug ?? "").trim();
      if (!slug) continue;
      const counts = (data.counts ?? {}) as Record<string, unknown>;

      const row = map.get(slug) ?? {
        slug,
        categorySlug: String(data.categorySlug ?? ""),
        chemicalName: String(data.chemicalName ?? ""),
        catalogNumber: String(data.catalogNumber ?? ""),
        score: 0,
        totalEvents: 0,
        viewFromList: 0,
        viewDetail: 0,
        wishlistAdds: 0,
        cartAdds: 0,
        enquirySubmits: 0,
        lastEventAtIso: "",
      };

      row.score += Number(data.score ?? 0);
      row.totalEvents += Number(data.totalEvents ?? 0);
      row.viewFromList += Number(counts.view_from_list ?? 0);
      row.viewDetail += Number(counts.view_detail ?? 0);
      row.wishlistAdds += Number(counts.wishlist_add ?? 0);
      row.cartAdds += Number(counts.cart_add ?? 0);
      row.enquirySubmits += Number(counts.enquiry_submit ?? 0);

      const lastIso = String(data.lastEventAtIso ?? "");
      if (lastIso && (!row.lastEventAtIso || lastIso > row.lastEventAtIso)) {
        row.lastEventAtIso = lastIso;
      }
      if (!row.chemicalName) row.chemicalName = String(data.chemicalName ?? "");
      if (!row.catalogNumber) row.catalogNumber = String(data.catalogNumber ?? "");
      if (!row.categorySlug) row.categorySlug = String(data.categorySlug ?? "");
      map.set(slug, row);
    }

    const rows = Array.from(map.values())
      .sort((a, b) => b.score - a.score || b.totalEvents - a.totalEvents || b.lastEventAtIso.localeCompare(a.lastEventAtIso))
      .slice(0, limit);

    const totals = rows.reduce(
      (acc, row) => {
        acc.score += row.score;
        acc.totalEvents += row.totalEvents;
        return acc;
      },
      { score: 0, totalEvents: 0 },
    );

    return NextResponse.json({ rows, totals, days, fromDay });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load analytics" },
      { status: 500 },
    );
  }
}
