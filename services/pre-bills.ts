import { connectDb } from "@/lib/db";
import type { ExpenseCategory } from "@/lib/constants";
import type { CreatePreBillInput, UpdatePreBillInput } from "@/lib/validation";
import { Expense } from "@/models/Expense";
import { PreBill } from "@/models/PreBill";
import { User } from "@/models/User";
import type { PreBillDTO, PreBillItemDTO } from "@/types";
import type { FilterQuery } from "mongoose";

function toDTO(doc: {
  _id: { toString(): string };
  title: string;
  category: ExpenseCategory;
  notes?: string;
  createdBy: { toString(): string };
  items: { name: string; quantity: number; unit: PreBillItemDTO["unit"]; price?: number }[];
  status: "draft" | "finalized";
  linkedExpenseId?: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
}): PreBillDTO {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    category: doc.category,
    notes: doc.notes,
    createdBy: doc.createdBy.toString(),
    items: doc.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      ...(i.price !== undefined && i.price !== null ? { price: i.price } : {}),
    })),
    status: doc.status,
    linkedExpenseId: doc.linkedExpenseId?.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listPreBills(filters?: {
  status?: "draft" | "finalized";
}): Promise<PreBillDTO[]> {
  await connectDb();
  const q: FilterQuery<typeof PreBill> = {};
  if (filters?.status) q.status = filters.status;
  const rows = await PreBill.find(q).sort({ updatedAt: -1 }).lean();
  return rows.map((r) =>
    toDTO({
      _id: r._id,
      title: r.title,
      category: r.category as ExpenseCategory,
      notes: r.notes,
      createdBy: r.createdBy as unknown as { toString(): string },
      items: r.items,
      status: r.status,
      linkedExpenseId: r.linkedExpenseId as unknown as { toString(): string } | undefined,
      createdAt: (r as { createdAt: Date }).createdAt,
      updatedAt: (r as { updatedAt: Date }).updatedAt,
    }),
  );
}

export async function getPreBillById(id: string): Promise<PreBillDTO | null> {
  await connectDb();
  const r = await PreBill.findById(id).lean();
  if (!r) return null;
  return toDTO({
    _id: r._id,
    title: r.title,
    category: r.category as ExpenseCategory,
    notes: r.notes,
    createdBy: r.createdBy as unknown as { toString(): string },
    items: r.items,
    status: r.status,
    linkedExpenseId: r.linkedExpenseId as unknown as { toString(): string } | undefined,
    createdAt: (r as { createdAt: Date }).createdAt,
    updatedAt: (r as { updatedAt: Date }).updatedAt,
  });
}

export async function createPreBill(
  input: CreatePreBillInput,
  createdByLedgerUserId: string,
): Promise<PreBillDTO> {
  await connectDb();
  const doc = await PreBill.create({
    title: input.title,
    category: input.category,
    notes: input.notes?.trim() || undefined,
    createdBy: createdByLedgerUserId,
    items: input.items ?? [],
    status: "draft",
  });
  return toDTO(doc);
}

export async function updatePreBill(
  input: UpdatePreBillInput,
  actorLedgerUserId: string,
  isAdmin: boolean,
): Promise<PreBillDTO | null> {
  await connectDb();
  const existing = await PreBill.findById(input.id).lean();
  if (!existing) return null;
  if (existing.status !== "draft") {
    throw new Error("Only drafts can be edited");
  }
  const owner = String(existing.createdBy);
  if (!isAdmin && owner !== actorLedgerUserId) {
    throw new Error("You can only edit your own draft");
  }

  const doc = await PreBill.findByIdAndUpdate(
    input.id,
    {
      $set: {
        title: input.title,
        category: input.category,
        notes: input.notes?.trim() || undefined,
        items: input.items,
      },
    },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    title: doc.title,
    category: doc.category as ExpenseCategory,
    notes: doc.notes,
    createdBy: doc.createdBy as unknown as { toString(): string },
    items: doc.items,
    status: doc.status,
    linkedExpenseId: doc.linkedExpenseId as unknown as { toString(): string } | undefined,
    createdAt: (doc as { createdAt: Date }).createdAt,
    updatedAt: (doc as { updatedAt: Date }).updatedAt,
  });
}

/** Full edit of title, category, notes, and items while status stays finalized. */
export async function updateFinalizedPreBill(
  input: UpdatePreBillInput,
  actorLedgerUserId: string,
  isAdmin: boolean,
): Promise<PreBillDTO | null> {
  await connectDb();
  const existing = await PreBill.findById(input.id).lean();
  if (!existing) return null;
  if (existing.status !== "finalized") {
    throw new Error("Only finalized pre-bills can be updated here");
  }
  const owner = String(existing.createdBy);
  if (!isAdmin && owner !== actorLedgerUserId) {
    throw new Error("You can only edit your own pre-bill");
  }

  const doc = await PreBill.findByIdAndUpdate(
    input.id,
    {
      $set: {
        title: input.title,
        category: input.category,
        notes: input.notes?.trim() || undefined,
        items: input.items,
      },
    },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    title: doc.title,
    category: doc.category as ExpenseCategory,
    notes: doc.notes,
    createdBy: doc.createdBy as unknown as { toString(): string },
    items: doc.items,
    status: doc.status,
    linkedExpenseId: doc.linkedExpenseId as unknown as { toString(): string } | undefined,
    createdAt: (doc as { createdAt: Date }).createdAt,
    updatedAt: (doc as { updatedAt: Date }).updatedAt,
  });
}

export async function finalizePreBill(
  id: string,
  actorLedgerUserId: string,
  isAdmin: boolean,
): Promise<PreBillDTO | null> {
  await connectDb();
  const existing = await PreBill.findById(id).lean();
  if (!existing) return null;
  if (existing.status !== "draft") {
    throw new Error("Already finalized");
  }
  const owner = String(existing.createdBy);
  if (!isAdmin && owner !== actorLedgerUserId) {
    throw new Error("You can only finalize your own draft");
  }
  const title = String(existing.title ?? "").trim();
  if (!title) {
    throw new Error("Title is required");
  }
  if (!existing.items || existing.items.length < 1) {
    throw new Error("Add at least one item before finalizing");
  }
  for (const it of existing.items) {
    if (!String(it.name ?? "").trim() || !(it.quantity > 0)) {
      throw new Error("Each item needs a name and a quantity greater than zero");
    }
  }

  const doc = await PreBill.findByIdAndUpdate(
    id,
    { $set: { status: "finalized" } },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    title: doc.title,
    category: doc.category as ExpenseCategory,
    notes: doc.notes,
    createdBy: doc.createdBy as unknown as { toString(): string },
    items: doc.items,
    status: doc.status,
    linkedExpenseId: doc.linkedExpenseId as unknown as { toString(): string } | undefined,
    createdAt: (doc as { createdAt: Date }).createdAt,
    updatedAt: (doc as { updatedAt: Date }).updatedAt,
  });
}

export async function deletePreBill(
  id: string,
  actorEmail: string | null | undefined,
  isSuperAdmin: boolean,
): Promise<boolean> {
  await connectDb();
  const existing = await PreBill.findById(id).lean();
  if (!existing) return false;

  if (!isSuperAdmin) {
    const creator = await User.findById(existing.createdBy).select("email").lean();
    const creatorEmail = (creator?.email ?? "").toLowerCase().trim();
    const actor = (actorEmail ?? "").toLowerCase().trim();
    if (!actor || actor !== creatorEmail) {
      throw new Error("You can only delete your own pre-bills");
    }
  }

  const result = await PreBill.deleteOne({ _id: existing._id });
  return result.deletedCount === 1;
}

export async function duplicatePreBill(
  id: string,
  actorLedgerUserId: string,
): Promise<PreBillDTO | null> {
  await connectDb();
  const src = await PreBill.findById(id).lean();
  if (!src) return null;

  const titleBase = String(src.title).trim();
  const title =
    titleBase.toLowerCase().endsWith("(copy)")
      ? titleBase
      : `${titleBase} (copy)`;

  const doc = await PreBill.create({
    title,
    category: src.category,
    notes: src.notes,
    createdBy: actorLedgerUserId,
    items: src.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      ...(typeof i.price === "number" ? { price: i.price } : {}),
    })),
    status: "draft",
  });
  return toDTO(doc);
}

export async function linkExpenseToPreBill(
  preBillId: string,
  expenseId: string,
  actorLedgerUserId: string,
  isAdmin: boolean,
): Promise<PreBillDTO | null> {
  await connectDb();
  const pre = await PreBill.findById(preBillId).lean();
  if (!pre) return null;
  if (pre.status !== "finalized") {
    throw new Error("Can only link expenses to finalized pre-bills");
  }
  if (pre.linkedExpenseId) {
    throw new Error("This pre-bill is already linked to an expense");
  }

  const exp = await Expense.findById(expenseId).lean();
  if (!exp) throw new Error("Expense not found");

  const payer = String(exp.paidBy);
  if (!isAdmin && payer !== actorLedgerUserId) {
    throw new Error("You can only link an expense you recorded");
  }

  const doc = await PreBill.findByIdAndUpdate(
    preBillId,
    { $set: { linkedExpenseId: expenseId } },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    title: doc.title,
    category: doc.category as ExpenseCategory,
    notes: doc.notes,
    createdBy: doc.createdBy as unknown as { toString(): string },
    items: doc.items,
    status: doc.status,
    linkedExpenseId: doc.linkedExpenseId as unknown as { toString(): string } | undefined,
    createdAt: (doc as { createdAt: Date }).createdAt,
    updatedAt: (doc as { updatedAt: Date }).updatedAt,
  });
}

