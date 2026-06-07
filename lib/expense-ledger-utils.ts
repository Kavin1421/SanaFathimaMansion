/** Expenses without status or with approved status count toward balances and wallet. */
export function isApprovedExpense(expense: { status?: string | null }): boolean {
  return !expense.status || expense.status === "approved";
}

export function filterApprovedExpenses<T extends { status?: string | null }>(expenses: T[]): T[] {
  return expenses.filter(isApprovedExpense);
}
