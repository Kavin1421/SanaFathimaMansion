import { eachDayOfInterval, format, subDays } from "date-fns";
import { CATEGORY_META, type ExpenseCategory } from "@/lib/constants";
import { connectDb } from "@/lib/db";
import { monthRange, previousMonthKey } from "@/lib/dates";
import { filterApprovedExpenses } from "@/lib/expense-ledger-utils";
import {
  computeBalances,
  computeTotalPaidByUser,
  pendingImbalanceMagnitude,
  roundMoney,
  simplifyDebts,
  type LedgerExpense,
  type LedgerSettlement,
} from "@/lib/ledger";
import { Expense } from "@/models/Expense";
import { HouseMonth } from "@/models/HouseMonth";
import { Settlement } from "@/models/Settlement";
import { User } from "@/models/User";
import type { DailySpendPoint, MonthlySummary, SettlementSuggestion } from "@/types";
import { getHouseSettings, isOverspendAcknowledged } from "./house-settings-ext";
import { countDueForMonth } from "./recurring-expenses";

function buildDailySpendSeries(
  monthExpenses: { date: Date; amount: number }[],
  prevMonthExpenses: { date: Date; amount: number }[],
  rangeStart: Date,
  rangeEndExclusive: Date,
): DailySpendPoint[] {
  const lastDay = subDays(rangeEndExclusive, 1);
  const days = eachDayOfInterval({ start: rangeStart, end: lastDay });
  const amountByKey = new Map<string, number>();
  for (const e of monthExpenses) {
    const k = format(e.date, "yyyy-MM-dd");
    amountByKey.set(k, roundMoney((amountByKey.get(k) ?? 0) + e.amount));
  }
  let cum = 0;
  const out: DailySpendPoint[] = [];
  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    const amount = roundMoney(amountByKey.get(key) ?? 0);
    cum = roundMoney(cum + amount);
    const dom = day.getDate();
    const priorCumulative = roundMoney(
      prevMonthExpenses
        .filter((e) => e.date.getDate() <= dom)
        .reduce((s, e) => s + e.amount, 0),
    );
    out.push({ date: key, amount, cumulative: cum, priorMonthCumulative: priorCumulative });
  }
  return out;
}

function toLedgerExpense(e: {
  amount: number;
  paidBy: { toString(): string };
  splitBetween: { toString(): string }[];
  splitEnabled?: boolean;
  splitMode?: "equal" | "custom";
  splitAmounts?: { userId: { toString(): string }; amount: number }[];
}): LedgerExpense {
  const splitAmounts: Record<string, number> | undefined = e.splitAmounts?.length
    ? Object.fromEntries(e.splitAmounts.map((row) => [row.userId.toString(), row.amount]))
    : undefined;
  return {
    amount: e.amount,
    paidBy: e.paidBy.toString(),
    splitBetween: e.splitBetween.map((id) => id.toString()),
    splitEnabled: e.splitEnabled !== false,
    splitMode: e.splitMode === "custom" ? "custom" : "equal",
    splitAmounts,
  };
}

function ledgerThroughCutoff(
  expenses: {
    date: Date;
    amount: number;
    paidBy: { toString(): string };
    splitBetween: { toString(): string }[];
    splitEnabled?: boolean;
    splitMode?: "equal" | "custom";
    splitAmounts?: { userId: { toString(): string }; amount: number }[];
  }[],
  settlements: {
    date: Date;
    status: string;
    fromUser: { toString(): string };
    toUser: { toString(): string };
    amount: number;
  }[],
  cutoff: Date,
): { ledgerExpenses: LedgerExpense[]; ledgerSettlements: LedgerSettlement[] } {
  const ledgerExpenses: LedgerExpense[] = [];
  for (const e of expenses) {
    if (e.date < cutoff) {
      ledgerExpenses.push(toLedgerExpense(e));
    }
  }
  const ledgerSettlements: LedgerSettlement[] = [];
  for (const s of settlements) {
    if (s.status === "completed" && s.date < cutoff) {
      ledgerSettlements.push({
        fromUser: s.fromUser.toString(),
        toUser: s.toUser.toString(),
        amount: s.amount,
      });
    }
  }
  return { ledgerExpenses, ledgerSettlements };
}

export async function getMonthlySummary(monthKey: string): Promise<MonthlySummary> {
  await connectDb();
  const { start, end } = monthRange(monthKey);
  const prevKey = previousMonthKey(monthKey);
  const { start: prevStart, end: prevEnd } = monthRange(prevKey);

  const [users, allExpensesRaw, allSettlements, houseSettings, pendingExpensesCount, recurringDueCount] =
    await Promise.all([
      User.find().sort({ name: 1 }).lean(),
      Expense.find().lean(),
      Settlement.find().lean(),
      getHouseSettings(),
      Expense.countDocuments({ status: "pending" }),
      countDueForMonth(monthKey),
    ]);

  const allExpenses = filterApprovedExpenses(allExpensesRaw);

  const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  const monthExpenses = allExpenses.filter((e) => e.date >= start && e.date < end);
  const prevMonthExpenses = allExpenses.filter((e) => e.date >= prevStart && e.date < prevEnd);

  const totalSpent = roundMoney(monthExpenses.reduce((s, e) => s + e.amount, 0));
  const rentTotal = roundMoney(
    monthExpenses.filter((e) => e.category === "Rent").reduce((s, e) => s + e.amount, 0),
  );
  const groceryTotal = roundMoney(
    monthExpenses.filter((e) => e.category === "Groceries").reduce((s, e) => s + e.amount, 0),
  );
  const vegetableTotal = roundMoney(
    monthExpenses.filter((e) => e.category === "Vegetables").reduce((s, e) => s + e.amount, 0),
  );
  const gasTotal = roundMoney(
    monthExpenses.filter((e) => e.category === "Gas").reduce((s, e) => s + e.amount, 0),
  );
  const miscTotal = roundMoney(
    monthExpenses.filter((e) => e.category === "Misc").reduce((s, e) => s + e.amount, 0),
  );
  const othersTotal = roundMoney(
    monthExpenses.filter((e) => e.category === "Others").reduce((s, e) => s + e.amount, 0),
  );

  const houseMonthRow = await HouseMonth.findOne({ monthKey }).lean();
  const monthBudget = houseMonthRow != null ? houseMonthRow.budget : null;
  const monthRemaining = monthBudget != null ? roundMoney(monthBudget - totalSpent) : null;
  const monthWalletProgress =
    monthBudget != null && monthBudget > 0 ? Math.min(1, totalSpent / monthBudget) : null;

  const warnThreshold = houseSettings.budgetThresholdWarn ?? 0.8;
  const overThreshold = houseSettings.budgetThresholdOver ?? 1;
  let budgetAlertLevel: "none" | "warn" | "over" = "none";
  if (monthBudget != null && monthBudget > 0) {
    const ratio = totalSpent / monthBudget;
    if (ratio >= overThreshold) budgetAlertLevel = "over";
    else if (ratio >= warnThreshold) budgetAlertLevel = "warn";
  }
  const overspendAcknowledged = isOverspendAcknowledged(houseSettings, monthKey);

  const categoryTotals: Record<ExpenseCategory, number> = {
    Rent: 0,
    Groceries: 0,
    Vegetables: 0,
    Gas: 0,
    Misc: 0,
    Others: 0,
  };
  for (const e of monthExpenses) {
    categoryTotals[e.category] += e.amount;
  }

  const categoryBreakdown = (
    Object.keys(categoryTotals) as ExpenseCategory[]
  ).map((category) => ({
    category,
    total: roundMoney(categoryTotals[category]),
    emoji: CATEGORY_META[category].emoji,
  }));

  const paidByMonth = computeTotalPaidByUser(monthExpenses.map(toLedgerExpense));
  const perUserContribution = users.map((u) => ({
    userId: u._id.toString(),
    name: u.name,
    paid: roundMoney(paidByMonth[u._id.toString()] ?? 0),
  }));

  const shareByUser: Record<string, number> = {};
  for (const e of monthExpenses) {
    if (e.splitEnabled === false) continue;
    if (e.splitMode === "custom" && e.splitAmounts?.length) {
      for (const row of e.splitAmounts) {
        const sid = row.userId.toString();
        shareByUser[sid] = (shareByUser[sid] ?? 0) + row.amount;
      }
      continue;
    }
    const n = e.splitBetween.length;
    if (n < 1) continue;
    const share = e.amount / n;
    for (const id of e.splitBetween) {
      const sid = id.toString();
      shareByUser[sid] = (shareByUser[sid] ?? 0) + share;
    }
  }
  const perUserShare = users.map((u) => ({
    userId: u._id.toString(),
    name: u.name,
    share: roundMoney(shareByUser[u._id.toString()] ?? 0),
  }));
  const personalBalances = users.map((u) => {
    const userId = u._id.toString();
    const totalPaid = roundMoney(paidByMonth[userId] ?? 0);
    const totalOwed = roundMoney(shareByUser[userId] ?? 0);
    return {
      userId,
      name: u.name,
      totalPaid,
      totalOwed,
      netBalance: roundMoney(totalPaid - totalOwed),
    };
  });

  const previousMonthTotal = roundMoney(prevMonthExpenses.reduce((s, e) => s + e.amount, 0));
  let percentChangeVsPrevious: number | undefined;
  let insight: string | undefined;
  if (previousMonthTotal > 0) {
    percentChangeVsPrevious = roundMoney(
      ((totalSpent - previousMonthTotal) / previousMonthTotal) * 100,
    );
    if (percentChangeVsPrevious > 1) {
      insight = `You spent ${percentChangeVsPrevious}% more than last month.`;
    } else if (percentChangeVsPrevious < -1) {
      insight = `You spent ${Math.abs(percentChangeVsPrevious)}% less than last month.`;
    }
  } else if (totalSpent > 0 && previousMonthTotal === 0) {
    insight = "No expenses recorded for the previous month.";
  }
  const dominantCategory = [...categoryBreakdown].sort((a, b) => b.total - a.total)[0];
  if (dominantCategory && dominantCategory.total > 0) {
    const sharePct = roundMoney((dominantCategory.total / totalSpent) * 100);
    insight = insight
      ? `${insight} ${dominantCategory.category} dominated at ${sharePct}% of spend.`
      : `${dominantCategory.category} dominated at ${sharePct}% of spend.`;
  }

  const winnerEntries = Object.entries(paidByMonth).sort((a, b) => b[1] - a[1]);
  const monthlyWinner =
    winnerEntries.length > 0 && winnerEntries[0][1] > 0
      ? {
          userId: winnerEntries[0][0],
          name: userMap.get(winnerEntries[0][0]) ?? "Unknown",
          totalPaid: roundMoney(winnerEntries[0][1]),
        }
      : undefined;
  const topSpenderLabel = monthlyWinner
    ? `${monthlyWinner.name} spent the most this month`
    : undefined;

  const { ledgerExpenses, ledgerSettlements } = ledgerThroughCutoff(
    allExpenses,
    allSettlements,
    end,
  );
  const balances = computeBalances(ledgerExpenses, ledgerSettlements);
  const balanceRows = users.map((u) => ({
    userId: u._id.toString(),
    name: u.name,
    balance: roundMoney(balances[u._id.toString()] ?? 0),
  }));

  const suggestionsRaw = simplifyDebts(balances);
  const suggestions: SettlementSuggestion[] = suggestionsRaw.map((s) => ({
    fromUserId: s.from,
    toUserId: s.to,
    amount: roundMoney(s.amount),
    fromName: userMap.get(s.from) ?? "?",
    toName: userMap.get(s.to) ?? "?",
  }));

  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8)
    .map((e) => ({
      _id: e._id.toString(),
      title: e.title,
      amount: e.amount,
      category: e.category,
      paidBy: e.paidBy.toString(),
      splitEnabled: e.splitEnabled !== false,
      splitBetween: e.splitBetween.map((id) => id.toString()),
      date: e.date.toISOString(),
      notes: e.notes,
      description: e.description,
      billImage: e.billImage,
      billImages: e.billImages,
    }));

  const recentExpensesDetailed = recentExpenses.map((row) => ({
    ...row,
    paidByName: userMap.get(row.paidBy) ?? "Unknown",
  }));

  const dailySpend = buildDailySpendSeries(
    monthExpenses.map((e) => ({ date: e.date, amount: e.amount })),
    prevMonthExpenses.map((e) => ({ date: e.date, amount: e.amount })),
    start,
    end,
  );

  return {
    monthKey,
    monthLabel: format(start, "MMMM yyyy"),
    totalSpent,
    rentTotal,
    groceryTotal,
    vegetableTotal,
    gasTotal,
    miscTotal,
    othersTotal,
    monthBudget,
    monthRemaining,
    monthWalletProgress,
    budgetAlertLevel,
    overspendAcknowledged,
    pendingExpensesCount,
    recurringDueCount,
    topSpenderLabel,
    categoryBreakdown,
    perUserContribution,
    perUserShare,
    previousMonthTotal,
    percentChangeVsPrevious,
    monthlyWinner,
    insight,
    pendingBalanceMagnitude: pendingImbalanceMagnitude(balances),
    balances: balanceRows,
    personalBalances,
    suggestions,
    recentExpenses,
    recentExpensesDetailed,
    dailySpend,
  };
}
