export type LedgerExpense = {
  amount: number;
  paidBy: string;
  splitBetween: string[];
  /** When false, expense counts toward wallet only — no per-user IOU deltas. */
  splitEnabled: boolean;
  splitMode?: "equal" | "custom";
  /** userId -> share owed (custom split only) */
  splitAmounts?: Record<string, number>;
};

export type LedgerSettlement = {
  fromUser: string;
  toUser: string;
  amount: number;
};

/** Per-expense net deltas: positive = owed to that person, negative = they owe. */
export function expenseToNetDeltas(expense: LedgerExpense): Record<string, number> {
  if (expense.splitEnabled === false) {
    return {};
  }
  const { amount, paidBy, splitBetween } = expense;
  if (splitBetween.length < 1 || amount <= 0) {
    throw new Error("Invalid expense: need positive amount and at least one splitter");
  }

  const deltas: Record<string, number> = {};
  deltas[paidBy] = (deltas[paidBy] ?? 0) + amount;

  if (expense.splitMode === "custom" && expense.splitAmounts) {
    for (const uid of splitBetween) {
      const share = expense.splitAmounts[uid];
      if (share == null || share < 0) {
        throw new Error("Invalid custom split: missing amount for participant");
      }
      deltas[uid] = (deltas[uid] ?? 0) - share;
    }
    return deltas;
  }

  const n = splitBetween.length;
  const share = amount / n;
  for (const uid of splitBetween) {
    deltas[uid] = (deltas[uid] ?? 0) - share;
  }
  return deltas;
}

export function mergeDeltas(into: Record<string, number>, deltas: Record<string, number>): void {
  for (const [k, v] of Object.entries(deltas)) {
    into[k] = (into[k] ?? 0) + v;
  }
}

/** Completed settlement: fromUser pays toUser — reduces fromUser's debt (balance up), creditor balance down. */
export function settlementToNetDeltas(s: LedgerSettlement): Record<string, number> {
  return {
    [s.fromUser]: s.amount,
    [s.toUser]: -s.amount,
  };
}

export function computeBalances(
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const e of expenses) {
    mergeDeltas(balances, expenseToNetDeltas(e));
  }
  for (const s of settlements) {
    mergeDeltas(balances, settlementToNetDeltas(s));
  }
  return balances;
}

export function computeTotalPaidByUser(expenses: LedgerExpense[]): Record<string, number> {
  const paid: Record<string, number> = {};
  for (const e of expenses) {
    paid[e.paidBy] = (paid[e.paidBy] ?? 0) + e.amount;
  }
  return paid;
}

export type DebtEdge = { from: string; to: string; amount: number };

/**
 * Greedy debt simplification: match largest debtor with largest creditor.
 * Assumes balances sum to ~0 (floating noise allowed).
 */
export function simplifyDebts(balances: Record<string, number>): DebtEdge[] {
  const entries = Object.entries(balances).map(([id, b]) => ({ id, b }));
  const debtors = entries
    .filter((e) => e.b < -1e-6)
    .map((e) => ({ id: e.id, amount: -e.b }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = entries
    .filter((e) => e.b > 1e-6)
    .map((e) => ({ id: e.id, amount: e.b }))
    .sort((a, b) => b.amount - a.amount);

  const edges: DebtEdge[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 1e-6) {
      edges.push({ from: debtors[i].id, to: creditors[j].id, amount: roundMoney(pay) });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 1e-6) i++;
    if (creditors[j].amount < 1e-6) j++;
  }

  return edges;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function pendingImbalanceMagnitude(balances: Record<string, number>): number {
  let pos = 0;
  let neg = 0;
  for (const v of Object.values(balances)) {
    if (v > 0) pos += v;
    else if (v < 0) neg += -v;
  }
  return roundMoney(Math.min(pos, neg));
}
