import { connectDb } from "@/lib/db";
import type { CreateSettlementInput } from "@/lib/validation";
import { Settlement } from "@/models/Settlement";
import type { SettlementDTO } from "@/types";
import { recomputeAllUserBalances } from "./recompute";

function toDTO(s: {
  _id: { toString(): string };
  fromUser: { toString(): string };
  toUser: { toString(): string };
  amount: number;
  date: Date;
  status: "pending" | "completed" | "confirmed";
  confirmedBy?: { toString(): string };
  confirmedAt?: Date;
  proofUrl?: string;
  note?: string;
}): SettlementDTO {
  return {
    _id: s._id.toString(),
    fromUser: s.fromUser.toString(),
    toUser: s.toUser.toString(),
    amount: s.amount,
    date: s.date.toISOString(),
    status: s.status,
    confirmedBy: s.confirmedBy?.toString(),
    confirmedAt: s.confirmedAt?.toISOString(),
    proofUrl: s.proofUrl,
    note: s.note,
  };
}

export async function listSettlements(): Promise<SettlementDTO[]> {
  await connectDb();
  const rows = await Settlement.find().sort({ date: -1 }).limit(100).lean();
  return rows.map((s) =>
    toDTO({
      _id: s._id,
      fromUser: s.fromUser,
      toUser: s.toUser,
      amount: s.amount,
      date: s.date,
      status: s.status,
      confirmedBy: s.confirmedBy as { toString(): string } | undefined,
      confirmedAt: s.confirmedAt,
      proofUrl: s.proofUrl,
      note: s.note,
    }),
  );
}

/** Record a completed settlement and refresh balances */
export async function recordCompletedSettlement(input: CreateSettlementInput): Promise<SettlementDTO> {
  await connectDb();
  const doc = await Settlement.create({
    fromUser: input.fromUser,
    toUser: input.toUser,
    amount: input.amount,
    date: input.date ?? new Date(),
    status: "completed",
    ...(input.proofUrl ? { proofUrl: input.proofUrl } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  });
  await recomputeAllUserBalances();
  return toDTO(doc);
}

export async function deleteSettlement(id: string): Promise<boolean> {
  await connectDb();
  const res = await Settlement.deleteOne({ _id: id });
  if (res.deletedCount === 0) return false;
  await recomputeAllUserBalances();
  return true;
}

export async function confirmSettlement(input: {
  id: string;
  confirmedByAccountId: string;
}): Promise<SettlementDTO | null> {
  await connectDb();
  const doc = await Settlement.findOneAndUpdate(
    { _id: input.id, status: "completed" },
    {
      $set: {
        status: "confirmed",
        confirmedBy: input.confirmedByAccountId,
        confirmedAt: new Date(),
      },
    },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    fromUser: doc.fromUser,
    toUser: doc.toUser,
    amount: doc.amount,
    date: doc.date,
    status: doc.status,
    confirmedBy: doc.confirmedBy as { toString(): string } | undefined,
    confirmedAt: doc.confirmedAt,
    proofUrl: doc.proofUrl,
    note: doc.note,
  });
}
