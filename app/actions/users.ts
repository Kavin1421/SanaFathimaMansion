"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validation";
import { appendAuditLog } from "@/services/audit-log";
import { createUser, deleteUser, getUserById, updateUser } from "@/services/users";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}

export async function createUserAction(input: CreateUserInput): Promise<ActionResult<Awaited<ReturnType<typeof createUser>>>> {
  if (!(await requireUserSession())) {
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createUser(parsed.data);
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not create roommate" };
  }
}

export async function updateUserAction(input: UpdateUserInput): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateUser>>>>> {
  const session = await requireUserSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    return { ok: false, error: "Only a super admin can edit roommates" };
  }
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const before = await getUserById(parsed.data.id);
    const data = await updateUser(parsed.data);
    if (!data) return { ok: false, error: "User not found" };
    try {
      await appendAuditLog({
        actionType: "UPDATE_USER",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: data._id, label: data.name },
        previousValue: toAuditJson(before),
        newValue: toAuditJson(data),
      });
    } catch (e) {
      console.error("[audit] update user", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not update roommate" };
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<null>> {
  const session = await requireUserSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    return { ok: false, error: "Only a super admin can remove roommates" };
  }
  try {
    const before = await getUserById(id);
    const res = await deleteUser(id);
    if (!res.ok) return { ok: false, error: res.error ?? "Delete failed" };
    try {
      await appendAuditLog({
        actionType: "DELETE_USER",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id, label: before?.name },
        previousValue: toAuditJson(before),
      });
    } catch (e) {
      console.error("[audit] delete user", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not delete roommate" };
  }
}
