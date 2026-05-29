import type { OrderRecord } from "@/lib/commerce/order-types";

export function resolveOrderCustomerName(
  order: Pick<OrderRecord, "userName" | "userEmail">,
  fallbackName?: string | null,
): string {
  const stored = order.userName?.trim();
  if (stored) return stored;

  const fromProfile = fallbackName?.trim();
  if (fromProfile) return fromProfile;

  const email = order.userEmail?.trim();
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) {
      return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  return "Customer";
}
