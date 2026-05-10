import type { PreBillDTO } from "@/types";

export async function patchPreBillItemPurchased(
  preBillId: string,
  itemIndex: number,
  isPurchased: boolean,
): Promise<PreBillDTO> {
  const r = await fetch(
    `/api/pre-bills/${encodeURIComponent(preBillId)}/items/${itemIndex}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPurchased }),
    },
  );
  const data = (await r.json().catch(() => ({}))) as { error?: string } & Partial<PreBillDTO>;
  if (!r.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Could not update item");
  }
  return data as PreBillDTO;
}
