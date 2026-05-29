import type { OrderRecord, OrderStatus } from "@/lib/commerce/order-types";

export type AdminOrderLine = {
  slug: string;
  chemicalName: string;
  catalogNumber: string;
  categorySlug?: string;
  productSlug?: string;
  variantSize?: string;
  variantPrice?: string;
  quantity: number;
  lineTotal: number | null;
};

export type AdminOrderRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: string;
  lineCount: number;
  totalUnits: number;
  subtotal: number;
  currency: string;
  amountPaise: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  items: AdminOrderLine[];
  createdAtIso: string;
  paidAtIso: string;
  deliveredAtIso: string;
};

const VALID: OrderStatus[] = ["pending", "paid", "delivered", "failed", "cancelled"];

export function adminOrderRowToInvoiceRecord(row: AdminOrderRow): OrderRecord {
  const status = VALID.includes(row.status as OrderStatus) ? (row.status as OrderStatus) : "pending";

  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName?.trim() || undefined,
    status,
    items: row.items.map((item) => {
      const slug = item.slug;
      return {
        slug,
        productSlug: item.productSlug || slug.split("__")[0] || slug,
        chemicalName: item.chemicalName,
        catalogNumber: item.catalogNumber,
        categorySlug: item.categorySlug ?? "",
        variantSize: String(item.variantSize ?? ""),
        variantPrice: String(item.variantPrice ?? ""),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        lineTotal: item.lineTotal,
      };
    }),
    lineCount: row.lineCount,
    totalUnits: row.totalUnits,
    subtotal: row.subtotal,
    currency: row.currency,
    amountPaise: row.amountPaise,
    razorpayOrderId: row.razorpayOrderId || undefined,
    razorpayPaymentId: row.razorpayPaymentId || undefined,
    createdAtIso: row.createdAtIso,
    paidAtIso: row.paidAtIso || undefined,
    deliveredAtIso: row.deliveredAtIso || undefined,
  };
}
