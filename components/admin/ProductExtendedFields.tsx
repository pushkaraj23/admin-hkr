"use client";

import type { CatalogProduct, ProductVariant } from "@/lib/types/catalog";

type Props = {
  form: CatalogProduct;
  setForm: React.Dispatch<React.SetStateAction<CatalogProduct>>;
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold uppercase text-caption-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function ProductExtendedFields({ form, setForm }: Props) {
  const variants = form.variants ?? [];

  function setVariants(next: ProductVariant[]) {
    setForm((f) => ({ ...f, variants: next }));
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setVariants(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants([...variants, { size: "", price: "", availabilityLabel: "" }]);
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  const inputCn =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2";

  return (
    <div className="md:col-span-2 space-y-6 border-t border-border pt-6">
      <h3 className="font-display text-base font-semibold text-foreground">Product page details</h3>

      <Field label="Alternative name (IUPAC)">
        <input
          value={form.alternativeName ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, alternativeName: e.target.value }))}
          className={inputCn}
        />
      </Field>

      <Field label="Solubility">
        <input
          value={form.solubility ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, solubility: e.target.value }))}
          className={inputCn}
          placeholder="Acetone, DCM, DMSO..."
        />
      </Field>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase text-caption-foreground">
            Ordering table (size / price / availability)
          </p>
          <button
            type="button"
            onClick={addVariant}
            className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            Add row
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {variants.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No rows — pack sizes from the list below will be shown on the site.
            </p>
          ) : (
            variants.map((v, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
                <input
                  value={v.size}
                  onChange={(e) => updateVariant(i, { size: e.target.value })}
                  placeholder="Size (e.g. 1g)"
                  className={inputCn}
                />
                <input
                  value={v.price}
                  onChange={(e) => updateVariant(i, { price: e.target.value })}
                  placeholder="Price (e.g. $140.00)"
                  className={inputCn}
                />
                <input
                  value={v.availabilityLabel}
                  onChange={(e) => updateVariant(i, { availabilityLabel: e.target.value })}
                  placeholder="Availability (e.g. ≥10 ship Jun 2, 2026)"
                  className={inputCn}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="rounded-lg border border-danger/35 px-3 py-2 text-xs font-semibold text-danger"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="SDS PDF URL">
          <input
            value={form.sdsUrl ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, sdsUrl: e.target.value }))}
            className={inputCn}
            placeholder="https://..."
          />
        </Field>
        <Field label="COA lot format hint">
          <input
            value={form.coaLotFormat ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, coaLotFormat: e.target.value }))}
            className={inputCn}
            placeholder="ABC12345"
          />
        </Field>
        <Field label="DSL status (Canada)">
          <input
            value={form.dslStatus ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dslStatus: e.target.value }))}
            className={inputCn}
          />
        </Field>
        <Field label="TSCA certification (US)">
          <input
            value={form.tscaCertification ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, tscaCertification: e.target.value }))}
            className={inputCn}
          />
        </Field>
        <Field label="RTECS number">
          <input
            value={form.rtecsNumber ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, rtecsNumber: e.target.value }))}
            className={inputCn}
          />
        </Field>
        <Field label="Shipping conditions">
          <input
            value={form.shippingConditions ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, shippingConditions: e.target.value }))}
            className={inputCn}
            placeholder="Ambient Temperature"
          />
        </Field>
        <Field label="Tariff code (US)" className="md:col-span-2">
          <input
            value={form.tariffCode ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, tariffCode: e.target.value }))}
            className={inputCn}
          />
        </Field>
      </div>

      <Field label="Safety statement (GHS)">
        <textarea
          value={form.safetyStatement ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, safetyStatement: e.target.value }))}
          rows={3}
          className={inputCn}
          placeholder="Not a dangerous substance according to GHS."
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(form.showSingleLotAvailability)}
          onChange={(e) => setForm((f) => ({ ...f, showSingleLotAvailability: e.target.checked }))}
        />
        Default &quot;Show availability for single lot&quot; checked on product page
      </label>
    </div>
  );
}
