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
  status: "pending" | "completed";
}): SettlementDTO {
  return {
    _id: s._id.toString(),
    fromUser: s.fromUser.toString(),
    toUser: s.toUser.toString(),
    amount: s.amount,
    date: s.date.toISOString(),
    status: s.status,
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
