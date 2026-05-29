import { getBrandLogoUrl } from "@/lib/commerce/company-invoice";
import { adminOrderRowToInvoiceRecord, type AdminOrderRow } from "@/lib/commerce/map-admin-order";
import { resolveOrderCustomerName } from "@/lib/commerce/order-customer";
import type { OrderRecord } from "@/lib/commerce/order-types";

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function canDownloadOrderInvoice(status: string): boolean {
  return status === "paid" || status === "delivered";
}

/** Generate and download a PDF invoice (client-only). */
export async function downloadAdminOrderInvoicePdf(row: AdminOrderRow): Promise<void> {
  if (!canDownloadOrderInvoice(row.status)) {
    throw new Error("Invoice is available after payment is confirmed.");
  }

  const [{ pdf }, { OrderInvoiceDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/commerce/order-invoice-document"),
  ]);

  const order = adminOrderRowToInvoiceRecord(row);
  const orderForPdf: OrderRecord = {
    ...order,
    userName: resolveOrderCustomerName(order),
  };

  const logoSrc = await loadImageAsDataUrl(getBrandLogoUrl());

  const blob = await pdf(<OrderInvoiceDocument order={orderForPdf} logoSrc={logoSrc} />).toBlob();
  const safeId = order.id.replace(/[^\w.-]+/g, "_");
  triggerBlobDownload(blob, `HKR-Invoice-${safeId}.pdf`);
}
