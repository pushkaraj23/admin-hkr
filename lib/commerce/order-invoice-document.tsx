import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY_INVOICE, INVOICE_FOOTER_NOTES } from "@/lib/commerce/company-invoice";
import { resolveOrderCustomerName } from "@/lib/commerce/order-customer";
import { ORDER_STATUS_LABELS, type OrderLineItem, type OrderRecord } from "@/lib/commerce/order-types";

const colors = {
  navy: "#17324d",
  blue: "#1a73e8",
  muted: "#567089",
  border: "#d8e2ec",
  rowAlt: "#f4f8fc",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: colors.navy,
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.blue,
  },
  logo: {
    width: 150,
    height: 42,
    objectFit: "contain",
    objectPosition: "left",
  },
  logoFallback: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.blue,
  },
  invoiceTitleBlock: {
    alignItems: "flex-end",
    maxWidth: 200,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    letterSpacing: 1,
  },
  invoiceSubtitle: {
    marginTop: 4,
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  metaCol: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: colors.navy,
  },
  bodyTextMuted: {
    fontSize: 8,
    lineHeight: 1.4,
    color: colors.muted,
    marginTop: 2,
  },
  billToBox: {
    marginBottom: 18,
    padding: 12,
    backgroundColor: colors.rowAlt,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  table: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.navy,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.rowAlt,
  },
  colItem: { width: "34%" },
  colCatalog: { width: "14%" },
  colPack: { width: "14%" },
  colQty: { width: "8%", textAlign: "right" },
  colUnit: { width: "15%", textAlign: "right" },
  colAmount: { width: "15%", textAlign: "right" },
  cell: {
    fontSize: 8,
    lineHeight: 1.35,
    paddingRight: 4,
  },
  cellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  totalsBox: {
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: colors.navy,
  },
  totalLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },
  grandLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
  },
  grandValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
  },
  paymentBox: {
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  paymentKey: {
    width: 110,
    fontSize: 8,
    color: colors.muted,
  },
  paymentVal: {
    flex: 1,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerNote: {
    fontSize: 7,
    color: colors.muted,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  footerBrand: {
    marginTop: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.blue,
  },
});

export type OrderInvoiceDocumentProps = {
  order: OrderRecord;
  logoSrc: string | null;
};

export function OrderInvoiceDocument({ order, logoSrc }: OrderInvoiceDocumentProps) {
  const currency = order.currency === "USD" ? "USD" : order.currency === "EUR" ? "EUR" : "INR";
  const invoiceDate = order.paidAtIso || order.createdAtIso;
  const amountFromPaise = order.amountPaise > 0 ? order.amountPaise / 100 : order.subtotal;
  const customerName = resolveOrderCustomerName(order);

  return (
    <Document title={`Invoice ${order.id}`} author={COMPANY_INVOICE.legalName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {logoSrc ? (
              <Image src={logoSrc} style={styles.logo} />
            ) : (
              <Text style={styles.logoFallback}>{COMPANY_INVOICE.brandName}</Text>
            )}
            <Text style={[styles.bodyTextMuted, { marginTop: 6, maxWidth: 240 }]}>
              {COMPANY_INVOICE.tagline}
            </Text>
          </View>
          <View style={styles.invoiceTitleBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceSubtitle}>Original for recipient</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.sectionLabel}>From</Text>
            <Text style={styles.bodyText}>{COMPANY_INVOICE.legalName}</Text>
            <Text style={styles.bodyTextMuted}>{COMPANY_INVOICE.address}</Text>
            <Text style={styles.bodyTextMuted}>{COMPANY_INVOICE.email}</Text>
            <Text style={styles.bodyTextMuted}>{COMPANY_INVOICE.phone}</Text>
            <Text style={styles.bodyTextMuted}>{COMPANY_INVOICE.website}</Text>
            {COMPANY_INVOICE.gstin ? (
              <Text style={[styles.bodyTextMuted, { marginTop: 4 }]}>GSTIN: {COMPANY_INVOICE.gstin}</Text>
            ) : null}
            {COMPANY_INVOICE.pan ? (
              <Text style={styles.bodyTextMuted}>PAN: {COMPANY_INVOICE.pan}</Text>
            ) : null}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.sectionLabel}>Invoice details</Text>
            <MetaLine label="Invoice no." value={order.id} />
            <MetaLine label="Invoice date" value={formatInvoiceDate(invoiceDate)} />
            <MetaLine label="Order placed" value={formatInvoiceDate(order.createdAtIso)} />
            <MetaLine label="Order status" value={ORDER_STATUS_LABELS[order.status] ?? order.status} />
            <MetaLine label="Currency" value={currency} />
          </View>
        </View>

        <View style={styles.billToBox}>
          <Text style={styles.sectionLabel}>Bill to</Text>
          <Text style={[styles.bodyText, { fontFamily: "Helvetica-Bold" }]}>{customerName}</Text>
          {order.userEmail ? (
            <Text style={[styles.bodyTextMuted, { marginTop: 4 }]}>{order.userEmail}</Text>
          ) : null}
          <Text style={styles.bodyTextMuted}>Account ref. {order.userId}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colCatalog]}>Catalog #</Text>
            <Text style={[styles.tableHeaderCell, styles.colPack]}>Pack size</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit price</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
          </View>
          {order.items.map((item, index) => (
            <LineItemRow key={item.slug} item={item} currency={currency} alt={index % 2 === 1} />
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Line items</Text>
              <Text style={styles.totalValue}>{order.lineCount}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total units</Text>
              <Text style={styles.totalValue}>{order.totalUnits}</Text>
            </View>
            <View style={styles.totalRowGrand}>
              <Text style={styles.grandLabel}>Amount paid</Text>
              <Text style={styles.grandValue}>{formatInvoiceMoney(amountFromPaise, currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.sectionLabel}>Payment information</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentKey}>Payment method</Text>
            <Text style={styles.paymentVal}>Online · Razorpay</Text>
          </View>
          {order.razorpayOrderId ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Razorpay order ID</Text>
              <Text style={styles.paymentVal}>{order.razorpayOrderId}</Text>
            </View>
          ) : null}
          {order.razorpayPaymentId ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Payment ID</Text>
              <Text style={styles.paymentVal}>{order.razorpayPaymentId}</Text>
            </View>
          ) : null}
          {order.paidAtIso ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Paid on</Text>
              <Text style={styles.paymentVal}>{formatInvoiceDate(order.paidAtIso)}</Text>
            </View>
          ) : null}
          {order.deliveredAtIso ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Delivered on</Text>
              <Text style={styles.paymentVal}>{formatInvoiceDate(order.deliveredAtIso)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {INVOICE_FOOTER_NOTES.map((note) => (
            <Text key={note} style={styles.footerNote}>
              · {note}
            </Text>
          ))}
          <Text style={styles.footerBrand}>
            Thank you for choosing {COMPANY_INVOICE.brandName}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 3 }}>
      <Text style={{ width: 72, fontSize: 8, color: colors.muted }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold" }}>{value}</Text>
    </View>
  );
}

function LineItemRow({
  item,
  currency,
  alt,
}: {
  item: OrderLineItem;
  currency: string;
  alt: boolean;
}) {
  const qty = Math.max(1, item.quantity);
  const unit =
    item.lineTotal !== null && qty > 0
      ? item.lineTotal / qty
      : parsePriceFromLabel(item.variantPrice);
  const amount = item.lineTotal ?? (unit !== null ? unit * qty : null);

  return (
    <View style={[styles.tableRow, alt ? styles.tableRowAlt : {}]}>
      <View style={styles.colItem}>
        <Text style={styles.cellBold}>{item.chemicalName}</Text>
        {item.categorySlug ? (
          <Text style={styles.bodyTextMuted}>Category: {item.categorySlug}</Text>
        ) : null}
      </View>
      <Text style={[styles.cell, styles.colCatalog]}>{item.catalogNumber || "—"}</Text>
      <Text style={[styles.cell, styles.colPack]}>{item.variantSize || "—"}</Text>
      <Text style={[styles.cell, styles.colQty]}>{String(qty)}</Text>
      <Text style={[styles.cell, styles.colUnit]}>
        {unit !== null ? formatInvoiceMoney(unit, currency) : item.variantPrice || "—"}
      </Text>
      <Text style={[styles.cellBold, styles.colAmount]}>
        {amount !== null ? formatInvoiceMoney(amount, currency) : "—"}
      </Text>
    </View>
  );
}

function parsePriceFromLabel(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || /quote|request|contact|tbd|n\/a/i.test(trimmed)) return null;
  const match = trimmed.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** PDF-safe currency labels (Helvetica does not render the ₹ glyph). */
export function formatInvoiceMoney(amount: number, currency: string): string {
  const value = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (currency === "USD") return `USD ${value}`;
  if (currency === "EUR") return `EUR ${value}`;
  if (currency === "GBP") return `GBP ${value}`;
  return `Rs. ${value}`;
}

export function formatInvoiceDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
