import { CATEGORY_META } from "@/lib/constants";
import { monthRange } from "@/lib/dates";
import { connectDb } from "@/lib/db";
import { filterApprovedExpenses } from "@/lib/expense-ledger-utils";
import { roundMoney } from "@/lib/ledger";
import { Expense } from "@/models/Expense";
import type { MonthlyStoryDTO } from "@/types";
import { getMonthlySummary } from "./aggregations";

export async function getMonthlyStory(monthKey: string): Promise<MonthlyStoryDTO> {
  const summary = await getMonthlySummary(monthKey);
  const { start, end } = monthRange(monthKey);

  await connectDb();
  const monthExpenses = await Expense.find({ date: { $gte: start, $lt: end } }).lean();
  const approved = filterApprovedExpenses(monthExpenses);

  const topCategoryEntry = [...summary.categoryBreakdown]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)[0];

  const biggest = approved.length
    ? approved.reduce((max, e) => (e.amount > max.amount ? e : max), approved[0])
    : undefined;

  let percentChange: number | undefined;
  if (summary.previousMonthTotal != null && summary.previousMonthTotal > 0) {
    percentChange = roundMoney(
      ((summary.totalSpent - summary.previousMonthTotal) / summary.previousMonthTotal) * 100,
    );
  }

  return {
    monthKey: summary.monthKey,
    monthLabel: summary.monthLabel,
    totalSpent: summary.totalSpent,
    previousMonthTotal: summary.previousMonthTotal ?? 0,
    percentChange,
    topCategory: topCategoryEntry
      ? {
          category: topCategoryEntry.category,
          total: topCategoryEntry.total,
          emoji: CATEGORY_META[topCategoryEntry.category].emoji,
        }
      : undefined,
    biggestExpense: biggest
      ? { title: biggest.title, amount: roundMoney(biggest.amount) }
      : undefined,
    topSpender: summary.monthlyWinner
      ? { name: summary.monthlyWinner.name, totalPaid: summary.monthlyWinner.totalPaid }
      : undefined,
    walletUsedPercent:
      summary.monthWalletProgress != null
        ? roundMoney(summary.monthWalletProgress * 100)
        : undefined,
    pendingApprovals: summary.pendingExpensesCount,
  };
}
