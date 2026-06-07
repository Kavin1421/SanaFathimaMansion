import { connectDb } from "@/lib/db";
import { monthRange } from "@/lib/dates";
import type { ExpenseCategory } from "@/lib/constants";
import type { CreateRecurringExpenseInput } from "@/lib/validation";
import { RecurringExpense } from "@/models/RecurringExpense";
import type { RecurringExpenseDTO } from "@/types";
import { createExpense } from "./expenses";

function toDTO(doc: {
  _id: { toString(): string };
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: { toString(): string };
  splitEnabled: boolean;
  splitMode: "equal" | "custom";
  splitBetween: { toString(): string }[];
  dayOfMonth: number;
  active: boolean;
  lastPostedMonthKey?: string;
}): RecurringExpenseDTO {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    amount: doc.amount,
    category: doc.category,
    paidBy: doc.paidBy.toString(),
    splitEnabled: doc.splitEnabled,
    splitMode: doc.splitMode,
    splitBetween: doc.splitBetween.map((id) => id.toString()),
    dayOfMonth: doc.dayOfMonth,
    active: doc.active,
    lastPostedMonthKey: doc.lastPostedMonthKey,
  };
}

export async function listRecurringExpenses(): Promise<RecurringExpenseDTO[]> {
  await connectDb();
  const rows = await RecurringExpense.find().sort({ title: 1 }).lean();
  return rows.map((r) =>
    toDTO({
      _id: r._id,
      title: r.title,
      amount: r.amount,
      category: r.category,
      paidBy: r.paidBy as { toString(): string },
      splitEnabled: r.splitEnabled,
      splitMode: r.splitMode,
      splitBetween: r.splitBetween as { toString(): string }[],
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      lastPostedMonthKey: r.lastPostedMonthKey,
    }),
  );
}

export async function getRecurringExpenseById(id: string): Promise<RecurringExpenseDTO | null> {
  await connectDb();
  const doc = await RecurringExpense.findById(id).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    title: doc.title,
    amount: doc.amount,
    category: doc.category,
    paidBy: doc.paidBy as { toString(): string },
    splitEnabled: doc.splitEnabled,
    splitMode: doc.splitMode,
    splitBetween: doc.splitBetween as { toString(): string }[],
    dayOfMonth: doc.dayOfMonth,
    active: doc.active,
    lastPostedMonthKey: doc.lastPostedMonthKey,
  });
}

export async function createRecurringExpense(
  input: CreateRecurringExpenseInput & { createdBy: string },
): Promise<RecurringExpenseDTO> {
  await connectDb();
  const splitBetween =
    input.splitEnabled && input.splitBetween.length > 0 ? input.splitBetween : [input.paidBy];
  const doc = await RecurringExpense.create({
    title: input.title.trim(),
    amount: input.amount,
    category: input.category,
    paidBy: input.paidBy,
    splitEnabled: input.splitEnabled,
    splitMode: input.splitMode,
    splitBetween,
    dayOfMonth: input.dayOfMonth,
    active: input.active,
    createdBy: input.createdBy,
  });
  return toDTO(doc);
}

export async function updateRecurringExpense(input: {
  id: string;
  title?: string;
  amount?: number;
  category?: ExpenseCategory;
  paidBy?: string;
  splitEnabled?: boolean;
  splitMode?: "equal" | "custom";
  splitBetween?: string[];
  dayOfMonth?: number;
  active?: boolean;
}): Promise<RecurringExpenseDTO | null> {
  await connectDb();
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.category !== undefined) updates.category = input.category;
  if (input.paidBy !== undefined) updates.paidBy = input.paidBy;
  if (input.splitEnabled !== undefined) updates.splitEnabled = input.splitEnabled;
  if (input.splitMode !== undefined) updates.splitMode = input.splitMode;
  if (input.splitBetween !== undefined) updates.splitBetween = input.splitBetween;
  if (input.dayOfMonth !== undefined) updates.dayOfMonth = input.dayOfMonth;
  if (input.active !== undefined) updates.active = input.active;
  const doc = await RecurringExpense.findByIdAndUpdate(input.id, updates, { new: true }).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    title: doc.title,
    amount: doc.amount,
    category: doc.category,
    paidBy: doc.paidBy as { toString(): string },
    splitEnabled: doc.splitEnabled,
    splitMode: doc.splitMode,
    splitBetween: doc.splitBetween as { toString(): string }[],
    dayOfMonth: doc.dayOfMonth,
    active: doc.active,
    lastPostedMonthKey: doc.lastPostedMonthKey,
  });
}

export async function deleteRecurringExpense(id: string): Promise<boolean> {
  await connectDb();
  const res = await RecurringExpense.deleteOne({ _id: id });
  return res.deletedCount > 0;
}

export async function listDueForMonth(monthKey: string): Promise<RecurringExpenseDTO[]> {
  await connectDb();
  const rows = await RecurringExpense.find({
    active: true,
    $or: [{ lastPostedMonthKey: { $ne: monthKey } }, { lastPostedMonthKey: { $exists: false } }],
  })
    .sort({ dayOfMonth: 1 })
    .lean();
  return rows.map((r) =>
    toDTO({
      _id: r._id,
      title: r.title,
      amount: r.amount,
      category: r.category,
      paidBy: r.paidBy as { toString(): string },
      splitEnabled: r.splitEnabled,
      splitMode: r.splitMode,
      splitBetween: r.splitBetween as { toString(): string }[],
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      lastPostedMonthKey: r.lastPostedMonthKey,
    }),
  );
}

export async function countDueForMonth(monthKey: string): Promise<number> {
  await connectDb();
  return RecurringExpense.countDocuments({
    active: true,
    $or: [{ lastPostedMonthKey: { $ne: monthKey } }, { lastPostedMonthKey: { $exists: false } }],
  });
}

export async function postRecurring(
  id: string,
  monthKey: string,
): Promise<{ recurring: RecurringExpenseDTO; expenseId: string } | null> {
  await connectDb();
  const doc = await RecurringExpense.findById(id).lean();
  if (!doc || !doc.active) return null;
  if (doc.lastPostedMonthKey === monthKey) {
    throw new Error("Already posted for this month");
  }

  const { start } = monthRange(monthKey);
  const day = Math.min(doc.dayOfMonth, 28);
  const expenseDate = new Date(start.getFullYear(), start.getMonth(), day);

  const splitBetween = doc.splitBetween.map((id) => id.toString());
  const expense = await createExpense({
    title: doc.title,
    amount: doc.amount,
    category: doc.category,
    paidBy: doc.paidBy.toString(),
    splitEnabled: doc.splitEnabled,
    splitMode: doc.splitMode,
    splitBetween: doc.splitEnabled ? splitBetween : [doc.paidBy.toString()],
    splitAmounts: undefined,
    date: expenseDate,
    status: "approved",
  });

  await RecurringExpense.updateOne({ _id: id }, { $set: { lastPostedMonthKey: monthKey } });

  const updated = await getRecurringExpenseById(id);
  if (!updated) return null;
  return { recurring: updated, expenseId: expense._id };
}
