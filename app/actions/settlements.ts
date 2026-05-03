"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createSettlementSchema, type CreateSettlementInput } from "@/lib/validation";
import { notifyWhatsAppSettlementRecorded } from "@/lib/whatsapp-notify";
import { recordCompletedSettlement } from "@/services/settlements";
import type { ActionResult } from "./users";

export async function settleAction(
  input: CreateSettlementInput,
): Promise<ActionResult<Awaited<ReturnType<typeof recordCompletedSettlement>>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = createSettlementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await recordCompletedSettlement(parsed.data);
    notifyWhatsAppSettlementRecorded(
      parsed.data.fromUser,
      parsed.data.toUser,
      parsed.data.amount,
    );
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not record settlement" };
  }
}
