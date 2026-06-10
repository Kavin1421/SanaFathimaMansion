export const MAX_EXPENSE_BILL_IMAGES = 3;

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Normalize legacy `billImage` + `billImages` into a deduped list (max 3). */
export function normalizeBillImages(input: {
  billImages?: string[] | null;
  billImage?: string | null;
}): string[] {
  const fromArray = (input.billImages ?? [])
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter((u) => u.length > 0 && isHttpUrl(u));
  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray)).slice(0, MAX_EXPENSE_BILL_IMAGES);
  }
  const legacy = typeof input.billImage === "string" ? input.billImage.trim() : "";
  return legacy && isHttpUrl(legacy) ? [legacy] : [];
}

export function primaryBillImage(images: string[]): string | undefined {
  return images[0];
}
