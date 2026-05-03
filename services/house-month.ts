import { connectDb } from "@/lib/db";
import { monthRange } from "@/lib/dates";
import { roundMoney } from "@/lib/ledger";
import { Expense } from "@/models/Expense";
import { HouseMonth } from "@/models/HouseMonth";

export async function getHouseMonthByKey(monthKey: string) {
  await connectDb();
  return HouseMonth.findOne({ monthKey }).lean();
}

export async function upsertHouseMonthBudget(input: {
  monthKey: string;
  budget: number;
  carryForwardBalances?: boolean;
}) {
  await connectDb();
  const update: Record<string, unknown> = {
    monthKey: input.monthKey,
    budget: input.budget,
  };
  if (input.carryForwardBalances !== undefined) {
    update.carryForwardBalances = input.carryForwardBalances;
  }
  await HouseMonth.findOneAndUpdate({ monthKey: input.monthKey }, update, {
    upsert: true,
    new: true,
  });
}

/** Total spent in calendar month + optional budget row. */
export async function getMonthWalletSnapshot(monthKey: string): Promise<{
  totalSpent: number;
  budget: number | null;
  remaining: number | null;
}> {
  await connectDb();
  const { start, end } = monthRange(monthKey);
  const [hm, agg] = await Promise.all([
    HouseMonth.findOne({ monthKey }).lean(),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, t: { $sum: "$amount" } } },
    ]).exec(),
  ]);
  const totalSpent = roundMoney((agg[0] as { t?: number } | undefined)?.t ?? 0);
  const budget = hm != null ? hm.budget : null;
  const remaining = budget != null ? roundMoney(budget - totalSpent) : null;
  return { totalSpent, budget, remaining };
}
