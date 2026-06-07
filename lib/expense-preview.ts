import { convertToInr, type SupportedCurrency } from "@/lib/currency";
import { expenseToNetDeltas, roundMoney, type LedgerExpense } from "@/lib/ledger";

export type ExpensePreviewInput = {
  amount: number;
  paidBy: string;
  splitEnabled: boolean;
  splitMode: "equal" | "custom";
  splitBetween: string[];
  splitAmounts?: { userId: string; amount: number }[];
  currency?: SupportedCurrency;
  originalAmount?: number;
  exchangeRate?: number;
};

export type BalanceDeltaRow = {
  userId: string;
  name: string;
  before: number;
  after: number;
  delta: number;
};

export type ExpensePreviewResult = {
  inrAmount: number;
  currencyLabel?: string;
  perPersonShares: { userId: string; name: string; amount: number }[];
  walletImpact: number;
  balanceDeltas: BalanceDeltaRow[];
  isHouseExpense: boolean;
};

export function buildLedgerExpenseFromPreview(input: ExpensePreviewInput): LedgerExpense {
  const splitAmounts = input.splitAmounts?.length
    ? Object.fromEntries(input.splitAmounts.map((r) => [r.userId, r.amount]))
    : undefined;
  return {
    amount: input.amount,
    paidBy: input.paidBy,
    splitBetween: input.splitBetween,
    splitEnabled: input.splitEnabled,
    splitMode: input.splitMode,
    splitAmounts,
  };
}

export function computeExpensePreview(
  input: ExpensePreviewInput & { inrAmount: number },
  currentBalances: Record<string, number>,
  userNames: Record<string, string>,
): ExpensePreviewResult {
  const ledger = buildLedgerExpenseFromPreview({ ...input, amount: input.inrAmount });
  const canSplit =
    input.splitEnabled && input.splitBetween.length > 0 && input.inrAmount > 0;
  const deltas = canSplit ? expenseToNetDeltas(ledger) : {};
  const mergedAfter: Record<string, number> = { ...currentBalances };
  for (const [uid, d] of Object.entries(deltas)) {
    mergedAfter[uid] = roundMoney((mergedAfter[uid] ?? 0) + d);
  }

  const affectedIds = new Set([
    ...Object.keys(currentBalances),
    ...Object.keys(deltas),
    input.paidBy,
    ...input.splitBetween,
  ]);

  const balanceDeltas: BalanceDeltaRow[] = Array.from(affectedIds)
    .filter((uid) => userNames[uid])
    .map((userId) => {
      const before = roundMoney(currentBalances[userId] ?? 0);
      const after = roundMoney(mergedAfter[userId] ?? before);
      return {
        userId,
        name: userNames[userId],
        before,
        after,
        delta: roundMoney(after - before),
      };
    })
    .filter((r) => Math.abs(r.delta) > 0.001)
    .sort((a, b) => a.name.localeCompare(b.name));

  const perPersonShares: { userId: string; name: string; amount: number }[] = [];
  if (input.splitEnabled) {
    if (input.splitMode === "custom" && input.splitAmounts?.length) {
      for (const row of input.splitAmounts) {
        perPersonShares.push({
          userId: row.userId,
          name: userNames[row.userId] ?? "?",
          amount: roundMoney(row.amount),
        });
      }
    } else {
      const n = input.splitBetween.length;
      const share = n > 0 ? roundMoney(input.inrAmount / n) : 0;
      for (const uid of input.splitBetween) {
        perPersonShares.push({ userId: uid, name: userNames[uid] ?? "?", amount: share });
      }
    }
  }

  const currency = input.currency ?? "INR";
  const currencyLabel =
    currency !== "INR" && input.originalAmount != null
      ? `${input.originalAmount} ${currency} → ${formatInrPreview(input.inrAmount)}`
      : undefined;

  return {
    inrAmount: input.inrAmount,
    currencyLabel,
    perPersonShares,
    walletImpact: input.inrAmount,
    balanceDeltas,
    isHouseExpense: !input.splitEnabled,
  };
}

function formatInrPreview(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function resolveInrAmount(input: ExpensePreviewInput): number {
  const currency = input.currency ?? "INR";
  if (currency === "INR") return roundMoney(input.amount);
  const original = input.originalAmount ?? input.amount;
  return convertToInr(original, currency, input.exchangeRate);
}

export function isPreviewInputValid(input: ExpensePreviewInput): boolean {
  if (!input.paidBy?.trim()) return false;
  const inrAmount = resolveInrAmount(input);
  if (!(inrAmount > 0)) return false;
  if (!input.splitEnabled) return true;
  if (input.splitBetween.length < 1) return false;
  if (input.splitMode === "custom") {
    const amounts = input.splitAmounts ?? [];
    if (amounts.length !== input.splitBetween.length) return false;
    const sum = amounts.reduce((s, r) => s + r.amount, 0);
    if (Math.abs(sum - inrAmount) > 0.01) return false;
  }
  return true;
}
