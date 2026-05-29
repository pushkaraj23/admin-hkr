export const ORDER_STATUSES = ["pending", "paid", "delivered", "failed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

export type OrderLineItem = {
  slug: string;
  productSlug: string;
  chemicalName: string;
  catalogNumber: string;
  categorySlug: string;
  variantSize: string;
  variantPrice: string;
  quantity: number;
  lineTotal: number | null;
};

export type OrderRecord = {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  status: OrderStatus;
  items: OrderLineItem[];
  lineCount: number;
  totalUnits: number;
  subtotal: number;
  currency: string;
  amountPaise: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAtIso: string;
  paidAtIso?: string;
  deliveredAtIso?: string;
  adminNotes?: string;
};
