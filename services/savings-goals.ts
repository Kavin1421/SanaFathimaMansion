import { connectDb } from "@/lib/db";
import type { CreateSavingsGoalInput } from "@/lib/validation";
import { SavingsGoal } from "@/models/SavingsGoal";
import type { SavingsGoalDTO } from "@/types";

function toDTO(doc: {
  _id: { toString(): string };
  title: string;
  targetAmount: number;
  currentAmount: number;
  active: boolean;
}): SavingsGoalDTO {
  const progress =
    doc.targetAmount > 0
      ? Math.min(100, Math.round((doc.currentAmount / doc.targetAmount) * 100))
      : 0;
  return {
    _id: doc._id.toString(),
    title: doc.title,
    targetAmount: doc.targetAmount,
    currentAmount: doc.currentAmount,
    active: doc.active,
    progress,
  };
}

export async function listSavingsGoals(): Promise<SavingsGoalDTO[]> {
  await connectDb();
  const rows = await SavingsGoal.find().sort({ createdAt: -1 }).lean();
  return rows.map((r) =>
    toDTO({
      _id: r._id,
      title: r.title,
      targetAmount: r.targetAmount,
      currentAmount: r.currentAmount,
      active: r.active,
    }),
  );
}

export async function getSavingsGoalById(id: string): Promise<SavingsGoalDTO | null> {
  await connectDb();
  const doc = await SavingsGoal.findById(id).lean();
  if (!doc) return null;
  return toDTO(doc);
}

export async function createSavingsGoal(
  input: CreateSavingsGoalInput & { createdBy: string },
): Promise<SavingsGoalDTO> {
  await connectDb();
  const doc = await SavingsGoal.create({
    title: input.title.trim(),
    targetAmount: input.targetAmount,
    currentAmount: 0,
    createdBy: input.createdBy,
    active: true,
  });
  return toDTO(doc);
}

export async function updateSavingsGoal(input: {
  id: string;
  title?: string;
  targetAmount?: number;
  active?: boolean;
}): Promise<SavingsGoalDTO | null> {
  await connectDb();
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.targetAmount !== undefined) updates.targetAmount = input.targetAmount;
  if (input.active !== undefined) updates.active = input.active;
  const doc = await SavingsGoal.findByIdAndUpdate(input.id, updates, { new: true }).lean();
  if (!doc) return null;
  return toDTO(doc);
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  await connectDb();
  const res = await SavingsGoal.deleteOne({ _id: id });
  return res.deletedCount > 0;
}

export async function contributeSavingsGoal(
  id: string,
  amount: number,
): Promise<SavingsGoalDTO | null> {
  await connectDb();
  const doc = await SavingsGoal.findByIdAndUpdate(
    id,
    { $inc: { currentAmount: amount } },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO(doc);
}
