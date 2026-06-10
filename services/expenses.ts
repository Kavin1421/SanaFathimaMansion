import { normalizeBillImages, primaryBillImage } from "@/lib/expense-bills";
import { connectDb } from "@/lib/db";
import type { ExpenseCategory } from "@/lib/constants";
import { isApprovedExpense } from "@/lib/expense-ledger-utils";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validation";
import { Expense } from "@/models/Expense";
import type { ExpenseDTO } from "@/types";
import { recomputeAllUserBalances } from "./recompute";
import type { FilterQuery } from "mongoose";

const UNDO_GRACE_MS = 5 * 60 * 1000;

type ExpenseDocShape = {
  _id: { toString(): string };
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: { toString(): string };
  splitEnabled?: boolean;
  splitMode?: "equal" | "custom";
  splitBetween: { toString(): string }[];
  splitAmounts?: { userId: { toString(): string }; amount: number }[];
  date: Date;
  notes?: string;
  description?: string;
  billImage?: string;
  billImages?: string[];
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  currency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  comments?: { _id: { toString(): string }; accountId: string; authorName: string; text: string; createdAt: Date }[];
  reactions?: { emoji: string; accountId: string; authorName: string; createdAt: Date }[];
};

function toDTO(e: ExpenseDocShape): ExpenseDTO {
  const billImages = normalizeBillImages({ billImages: e.billImages, billImage: e.billImage });
  return {
    _id: e._id.toString(),
    title: e.title,
    amount: e.amount,
    category: e.category,
    paidBy: e.paidBy.toString(),
    splitEnabled: e.splitEnabled !== false,
    splitMode: e.splitMode === "custom" ? "custom" : "equal",
    splitBetween: e.splitBetween.map((id) => id.toString()),
    splitAmounts: e.splitAmounts?.map((row) => ({
      userId: row.userId.toString(),
      amount: row.amount,
    })),
    date: e.date.toISOString(),
    notes: e.notes,
    description: e.description,
    billImages,
    billImage: primaryBillImage(billImages),
    status: e.status,
    rejectionReason: e.rejectionReason,
    currency: e.currency,
    originalAmount: e.originalAmount,
    exchangeRate: e.exchangeRate,
    comments: (e.comments ?? []).map((c) => ({
      _id: c._id.toString(),
      accountId: c.accountId,
      authorName: c.authorName,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    })),
    reactions: (e.reactions ?? []).map((r) => ({
      emoji: r.emoji,
      accountId: r.accountId,
      authorName: r.authorName,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

function leanToShape(e: Record<string, unknown>): ExpenseDocShape {
  return e as unknown as ExpenseDocShape;
}

export type ExpenseListFilters = {
  monthKey?: string;
  category?: ExpenseCategory;
  paidBy?: string;
  search?: string;
  includePending?: boolean;
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
  if (!filters.includePending) {
    const approvedOnly = { $or: [{ status: { $exists: false } }, { status: "approved" }] };
    if (q.$or) {
      q.$and = [{ $or: q.$or }, approvedOnly];
      delete q.$or;
    } else {
      Object.assign(q, approvedOnly);
    }
  }

  const rows = await Expense.find(q).sort({ date: -1 }).lean();
  return rows.map((e) => toDTO(leanToShape(e)));
}

export async function listPendingExpenses(): Promise<ExpenseDTO[]> {
  await connectDb();
  const rows = await Expense.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
  return rows.map((e) => toDTO(leanToShape(e)));
}

export async function getExpenseById(id: string): Promise<ExpenseDTO | null> {
  await connectDb();
  const e = await Expense.findById(id).lean();
  if (!e) return null;
  return toDTO(leanToShape(e));
}

function resolveInputBillImages(input: {
  billImages?: string[];
  billImage?: string;
}): string[] {
  return normalizeBillImages({ billImages: input.billImages, billImage: input.billImage });
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseDTO> {
  await connectDb();
  const billImages = resolveInputBillImages(input);

  const doc = await Expense.create({
    title: input.title,
    amount: input.amount,
    category: input.category,
    paidBy: input.paidBy,
    splitEnabled: input.splitEnabled,
    splitMode: input.splitMode ?? "equal",
    splitBetween: input.splitBetween,
    ...(input.splitAmounts?.length
      ? {
          splitAmounts: input.splitAmounts.map((row) => ({
            userId: row.userId,
            amount: row.amount,
          })),
        }
      : {}),
    date: input.date,
    notes: input.notes,
    description: input.description,
    ...(billImages.length > 0
      ? { billImages, billImage: primaryBillImage(billImages) }
      : {}),
    status: input.status ?? "approved",
    ...(input.currency ? { currency: input.currency } : {}),
    ...(input.originalAmount != null ? { originalAmount: input.originalAmount } : {}),
    ...(input.exchangeRate != null ? { exchangeRate: input.exchangeRate } : {}),
    comments: [],
    reactions: [],
  });
  if (isApprovedExpense(doc)) {
    await recomputeAllUserBalances();
  }
  return toDTO(doc);
}

export async function approveExpense(id: string): Promise<ExpenseDTO | null> {
  await connectDb();
  const doc = await Expense.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "approved" }, $unset: { rejectionReason: 1 } },
    { new: true },
  ).lean();
  if (!doc) return null;
  await recomputeAllUserBalances();
  return toDTO(leanToShape(doc));
}

export async function rejectExpense(id: string, reason: string): Promise<ExpenseDTO | null> {
  await connectDb();
  const doc = await Expense.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "rejected", rejectionReason: reason.trim() } },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO(leanToShape(doc));
}

export async function undoExpense(id: string): Promise<ExpenseDTO | null> {
  await connectDb();
  const doc = await Expense.findById(id).lean();
  if (!doc) return null;
  const createdAt = (doc as { createdAt?: Date }).createdAt;
  if (!createdAt || Date.now() - createdAt.getTime() > UNDO_GRACE_MS) {
    throw new Error("Undo window expired");
  }
  const dto = toDTO(leanToShape(doc));
  const wasApproved = isApprovedExpense(doc);
  await Expense.deleteOne({ _id: id });
  if (wasApproved) {
    await recomputeAllUserBalances();
  }
  return dto;
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
  let splitMode =
    input.splitMode !== undefined
      ? input.splitMode
      : existing.splitMode === "custom"
        ? "custom"
        : "equal";

  if (splitEnabled === false) {
    splitBetweenIds = [paidByStr];
    splitMode = "equal";
  } else if (splitBetweenIds.length < 1) {
    splitBetweenIds = (existing.splitBetween as { toString(): string }[]).map((id) => id.toString());
  }

  if (splitMode !== "custom") splitMode = "equal";

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
  updates.splitMode = splitMode;
  if (splitMode === "custom") {
    const amounts =
      input.splitAmounts?.length
        ? input.splitAmounts
        : (
            existing.splitAmounts as { userId: { toString(): string }; amount: number }[] | undefined
          )?.map((row) => ({ userId: row.userId.toString(), amount: row.amount }));
    if (amounts?.length) {
      updates.splitAmounts = amounts.map((row) => ({
        userId: row.userId,
        amount: row.amount,
      }));
    }
  }

  const unset: Record<string, 1> = {};
  if (splitMode !== "custom") unset.splitAmounts = 1;
  if (input.date !== undefined) updates.date = input.date;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.originalAmount !== undefined) updates.originalAmount = input.originalAmount;
  if (input.exchangeRate !== undefined) updates.exchangeRate = input.exchangeRate;

  if (input.billImages !== undefined) {
    if (input.billImages === null || input.billImages.length === 0) {
      unset.billImage = 1;
      unset.billImages = 1;
    } else {
      const billImages = resolveInputBillImages({ billImages: input.billImages });
      updates.billImages = billImages;
      updates.billImage = primaryBillImage(billImages);
    }
  } else if (input.billImage !== undefined) {
    if (input.billImage === null) {
      unset.billImage = 1;
      unset.billImages = 1;
    } else {
      const billImages = resolveInputBillImages({ billImage: input.billImage });
      updates.billImages = billImages;
      updates.billImage = primaryBillImage(billImages);
    }
  }

  const mongoUpdate: Record<string, unknown> =
    Object.keys(unset).length > 0 ? { $set: updates, $unset: unset } : updates;

  const doc = await Expense.findByIdAndUpdate(input.id, mongoUpdate, { new: true }).lean();
  if (!doc) return null;
  if (isApprovedExpense(doc)) {
    await recomputeAllUserBalances();
  }
  return toDTO(leanToShape(doc));
}

export async function deleteExpense(id: string): Promise<boolean> {
  await connectDb();
  const existing = await Expense.findById(id).lean();
  if (!existing) return false;
  const wasApproved = isApprovedExpense(existing);
  const res = await Expense.deleteOne({ _id: id });
  if (res.deletedCount === 0) return false;
  if (wasApproved) {
    await recomputeAllUserBalances();
  }
  return true;
}

export async function addExpenseComment(input: {
  expenseId: string;
  accountId: string;
  authorName: string;
  text: string;
}): Promise<ExpenseDTO | null> {
  await connectDb();
  const text = input.text.trim();
  if (text.length < 1) throw new Error("Comment cannot be empty");
  if (text.length > 800) throw new Error("Comment too long");
  const doc = await Expense.findByIdAndUpdate(
    input.expenseId,
    {
      $push: {
        comments: {
          accountId: input.accountId,
          authorName: input.authorName,
          text,
          createdAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO(leanToShape(doc));
}

export async function toggleExpenseReaction(input: {
  expenseId: string;
  accountId: string;
  authorName: string;
  emoji: string;
}): Promise<ExpenseDTO | null> {
  await connectDb();
  const doc = await Expense.findById(input.expenseId).lean();
  if (!doc) return null;
  const reactions =
    (doc.reactions as { emoji: string; accountId: string; authorName: string; createdAt: Date }[] | undefined) ?? [];
  const idx = reactions.findIndex((r) => r.accountId === input.accountId && r.emoji === input.emoji);
  if (idx >= 0) {
    await Expense.updateOne(
      { _id: input.expenseId },
      { $pull: { reactions: { accountId: input.accountId, emoji: input.emoji } } },
    );
  } else {
    await Expense.updateOne(
      { _id: input.expenseId },
      {
        $push: {
          reactions: {
            emoji: input.emoji,
            accountId: input.accountId,
            authorName: input.authorName,
            createdAt: new Date(),
          },
        },
      },
    );
  }
  return getExpenseById(input.expenseId);
}

export async function countPendingExpenses(): Promise<number> {
  await connectDb();
  return Expense.countDocuments({ status: "pending" });
}
