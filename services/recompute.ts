import { connectDb } from "@/lib/db";
import {
  computeBalances,
  computeTotalPaidByUser,
  type LedgerExpense,
  type LedgerSettlement,
} from "@/lib/ledger";
import { Expense } from "@/models/Expense";
import { Settlement } from "@/models/Settlement";
import { User } from "@/models/User";

function toLedgerExpense(doc: {
  amount: number;
  paidBy: { toString(): string };
  splitBetween: { toString(): string }[];
  splitEnabled?: boolean;
}): LedgerExpense {
  return {
    amount: doc.amount,
    paidBy: doc.paidBy.toString(),
    splitBetween: doc.splitBetween.map((id) => id.toString()),
    splitEnabled: doc.splitEnabled !== false,
  };
}

export async function recomputeAllUserBalances(): Promise<void> {
  await connectDb();
  const [expenses, settlements, users] = await Promise.all([
    Expense.find().lean(),
    Settlement.find({ status: "completed" }).lean(),
    User.find().lean(),
  ]);

  const ledgerExpenses: LedgerExpense[] = expenses.map((e) =>
    toLedgerExpense({
      amount: e.amount,
      paidBy: e.paidBy,
      splitBetween: e.splitBetween,
      splitEnabled: e.splitEnabled,
    }),
  );

  const ledgerSettlements: LedgerSettlement[] = settlements.map((s) => ({
    fromUser: s.fromUser.toString(),
    toUser: s.toUser.toString(),
    amount: s.amount,
  }));

  const balances = computeBalances(ledgerExpenses, ledgerSettlements);
  const totalPaid = computeTotalPaidByUser(ledgerExpenses);

  await Promise.all(
    users.map((u) => {
      const id = u._id.toString();
      return User.updateOne(
        { _id: u._id },
        {
          totalPaid: totalPaid[id] ?? 0,
          balance: balances[id] ?? 0,
        },
      );
    }),
  );
}
