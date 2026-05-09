import type { PreBillItemDTO } from "@/types";

/** Single-line preview for lists (e.g. Oil - 1L). */
export function formatPreBillLineCompact(item: PreBillItemDTO): string {
  const qty =
    item.quantity % 1 === 0 ? String(item.quantity) : String(item.quantity);
  const qtyUnit = item.unit === "pcs" ? `${qty} ${item.unit}` : `${qty}${item.unit}`;
  return `${item.name} - ${qtyUnit}`;
}

export function sumOptionalLinePrices(items: { price?: number }[]): number {
  let s = 0;
  for (const i of items) {
    if (typeof i.price === "number" && Number.isFinite(i.price)) {
      s += i.price;
    }
  }
  return Math.round(s * 100) / 100;
}

/** Format pre-bill lines for expense notes field (safe for client bundles). */
export function formatPreBillItemsForExpenseNotes(
  items: PreBillItemDTO[],
  freeNotes?: string,
): string {
  const lines = items.map((i) => {
    const qty = i.quantity % 1 === 0 ? String(i.quantity) : String(i.quantity);
    const u = i.unit;
    const qtyUnit = u === "pcs" ? `${qty} ${u}` : `${qty}${u}`;
    const price =
      typeof i.price === "number" ? ` · ₹${i.price.toLocaleString("en-IN")}` : "";
    return `• ${i.name} - ${qtyUnit}${price}`;
  });
  const body = ["Pre-bill:", ...lines].join("\n");
  const extra = freeNotes?.trim();
  if (extra) return `${body}\n\n${extra}`;
  return body;
}
