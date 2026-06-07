"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isSuperAdminSession } from "@/lib/super-admin";
import { setAccountRoleSchema, updateAccountProfileSchema, type UpdateAccountProfileInput } from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import { getAccountProfile, setAccountRole, updateAccountProfile } from "@/services/account";

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

export async function setAccountRoleAction(input: {
  accountId: string;
  role: "admin" | "user";
}): Promise<ActionResult<{ id: string; email: string; role: "admin" | "user" }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  if (!isSuperAdminSession(session)) {
    return { ok: false, error: "Only the Super Admin can change household roles" };
  }

  const parsed = setAccountRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const before = await getAccountProfile(parsed.data.accountId);
    const data = await setAccountRole(parsed.data.accountId, parsed.data.role);
    if (!data) return { ok: false, error: "Account not found" };

    try {
      await appendAuditLog({
        actionType: "SET_ACCOUNT_ROLE",
        performedBy: performerFromSession(session),
        targetEntity: { type: "account", id: data.id, label: data.email },
        previousValue: toAuditJson(before),
        newValue: toAuditJson({ role: data.role }),
      });
    } catch (e) {
      console.error("[audit] set account role", e);
    }

    revalidatePath("/users");
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/audit-logs");
    return { ok: true, data: { id: data.id, email: data.email, role: data.role } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update role" };
  }
}
