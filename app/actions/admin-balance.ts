"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminSession } from "@/lib/admin";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import type { ActionResult } from "./users";

/** Direct balance override; next full expense recompute will refresh from ledger. */
export async function adminOverrideBalanceAction(
  userId: string,
  balance: number,
  totalPaid?: number,
): Promise<ActionResult<null>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    return { ok: false, error: "Admin only" };
  }
  if (!Number.isFinite(balance)) {
    return { ok: false, error: "Invalid balance" };
  }
  try {
    await connectDb();
    const patch: { balance: number; totalPaid?: number } = { balance };
    if (totalPaid !== undefined && Number.isFinite(totalPaid)) {
      patch.totalPaid = totalPaid;
    }
    const r = await User.findByIdAndUpdate(userId, patch);
    if (!r) return { ok: false, error: "User not found" };
    console.info("[admin] balance override", { userId, balance, totalPaid });
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not update balance" };
  }
}
