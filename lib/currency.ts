export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Static reference rates → INR (for reimbursement preview; not live FX). */
export const REFERENCE_RATES_TO_INR: Record<SupportedCurrency, number> = {
  INR: 1,
  USD: 84,
  EUR: 91,
  GBP: 106,
  AED: 23,
  SGD: 62,
};

export function convertToInr(amount: number, currency: SupportedCurrency, customRate?: number): number {
  const rate = currency === "INR" ? 1 : customRate ?? REFERENCE_RATES_TO_INR[currency];
  return Math.round(amount * rate * 100) / 100;
}
