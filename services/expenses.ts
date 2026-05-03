import { connectDb } from "@/lib/db";
import type { ExpenseCategory } from "@/lib/constants";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validation";
import { Expense } from "@/models/Expense";
import type { ExpenseDTO } from "@/types";
import { recomputeAllUserBalances } from "./recompute";
import type { FilterQuery } from "mongoose";

function toDTO(e: {
  _id: { toString(): string };
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: { toString(): string };
  splitEnabled?: boolean;
  splitBetween: { toString(): string }[];
  date: Date;
  notes?: string;
  description?: string;
  billImage?: string;
}): ExpenseDTO {
  return {
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
  };
}

export type ExpenseListFilters = {
  monthKey?: string;
  category?: ExpenseCategory;
  paidBy?: string;
  search?: string;
};

export async function listExpenses(filters: ExpenseListFilters): Promise<ExpenseDTO[]> {
  await connectDb();
  const q: FilterQuery<typeof Expense> = {};

  if (filters.monthKey) {
    const { start, end } = await import("@/lib/dates").then((m) => m.monthRange(filters.monthKey!));
    q.date = { $gte: start, $lt: end };
  }
  if (filters.category) q.category = filters.category;
  if (filters.paidBy) q.paidBy = filters.paidBy;
  if (filters.search?.trim()) {
    const t = filters.search.trim();
    q.$or = [
      { title: { $regex: t, $options: "i" } },
      { notes: { $regex: t, $options: "i" } },
      { description: { $regex: t, $options: "i" } },
    ];
  }

  const cursor = Expense.find(q).sort({ date: -1 });
  const rows = await cursor.lean();
  return rows.map((e) =>
    toDTO({
      _id: e._id,
      title: e.title,
      amount: e.amount,
      category: e.category,
      paidBy: e.paidBy as unknown as { toString(): string },
      splitEnabled: e.splitEnabled,
      splitBetween: e.splitBetween as unknown as { toString(): string }[],
      date: e.date,
      notes: e.notes,
      description: e.description,
      billImage: e.billImage,
    }),
  );
}

export async function getExpenseById(id: string): Promise<ExpenseDTO | null> {
  await connectDb();
  const e = await Expense.findById(id).lean();
  if (!e) return null;
  return toDTO({
    _id: e._id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    paidBy: e.paidBy,
    splitEnabled: e.splitEnabled,
    splitBetween: e.splitBetween,
    date: e.date,
    notes: e.notes,
    description: e.description,
    billImage: e.billImage,
  });
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseDTO> {
  await connectDb();
  const bill =
    typeof input.billImage === "string" && input.billImage.trim().length > 0
      ? input.billImage.trim()
      : undefined;

  const doc = await Expense.create({
    title: input.title,
    amount: input.amount,
    category: input.category,
    paidBy: input.paidBy,
    splitEnabled: input.splitEnabled,
    splitBetween: input.splitBetween,
    date: input.date,
    notes: input.notes,
    description: input.description,
    ...(bill ? { billImage: bill } : {}),
  });
  await recomputeAllUserBalances();
  return toDTO(doc);
}

export async function updateExpense(input: UpdateExpenseInput): Promise<ExpenseDTO | null> {
  await connectDb();
  const existing = await Expense.findById(input.id).lean();
  if (!existing) return null;

  const paidByStr =
    input.paidBy !== undefined ? input.paidBy : (existing.paidBy as { toString(): string }).toString();
  let splitEnabled =
    input.splitEnabled !== undefined ? input.splitEnabled : existing.splitEnabled !== false;
  let splitBetweenIds =
    input.splitBetween !== undefined
      ? input.splitBetween
      : (existing.splitBetween as { toString(): string }[]).map((id) => id.toString());

  if (splitEnabled === false) {
    splitBetweenIds = [paidByStr];
  } else if (splitBetweenIds.length < 1) {
    splitBetweenIds = (existing.splitBetween as { toString(): string }[]).map((id) => id.toString());
  }

  const category = input.category ?? existing.category;
  const description =
    input.description !== undefined ? input.description : existing.description;
  if (category === "Others" && !String(description ?? "").trim()) {
    throw new Error("Description required for Others");
  }

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.category !== undefined) updates.category = input.category;
  if (input.paidBy !== undefined) updates.paidBy = input.paidBy;
  updates.splitEnabled = splitEnabled;
  updates.splitBetween = splitBetweenIds;
  if (input.date !== undefined) updates.date = input.date;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.description !== undefined) updates.description = input.description;

  const unset: Record<string, 1> = {};
  if (input.billImage !== undefined) {
    if (input.billImage === null) {
      unset.billImage = 1;
    } else {
      updates.billImage = input.billImage.trim();
    }
  }

  const mongoUpdate: Record<string, unknown> =
    Object.keys(unset).length > 0 ? { $set: updates, $unset: unset } : updates;

  const doc = await Expense.findByIdAndUpdate(input.id, mongoUpdate, { new: true }).lean();
  if (!doc) return null;
  await recomputeAllUserBalances();
  return toDTO({
    _id: doc._id,
    title: doc.title,
    amount: doc.amount,
    category: doc.category,
    paidBy: doc.paidBy,
    splitEnabled: doc.splitEnabled,
    splitBetween: doc.splitBetween,
    date: doc.date,
    notes: doc.notes,
    description: doc.description,
    billImage: doc.billImage,
  });
}

export async function deleteExpense(id: string): Promise<boolean> {
  await connectDb();
  const res = await Expense.deleteOne({ _id: id });
  if (res.deletedCount === 0) return false;
  await recomputeAllUserBalances();
  return true;
}
