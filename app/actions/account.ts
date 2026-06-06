"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { updateAccountProfileSchema, type UpdateAccountProfileInput } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import { getAccountProfile, updateAccountProfile } from "@/services/account";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function updateAccountProfileAction(
  input: UpdateAccountProfileInput,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateAccountProfile>>>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const parsed = updateAccountProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const before = await getAccountProfile(session.user.id);
    const data = await updateAccountProfile(session.user.id, parsed.data);
    if (!data) return { ok: false, error: "Account not found" };

    try {
      await appendAuditLog({
        actionType: "UPDATE_ACCOUNT_PROFILE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "account", id: data.id, label: data.name },
        previousValue: toAuditJson(before),
        newValue: toAuditJson(data),
      });
    } catch (e) {
      console.error("[audit] update account profile", e);
    }

    revalidatePath("/profile");
    revalidatePath("/users");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not update profile" };
  }
}
