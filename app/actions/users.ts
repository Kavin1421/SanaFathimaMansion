"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { performerAnonymous, performerFromSession, toAuditJson } from "@/lib/audit-helper";
import { isAdminSession } from "@/lib/admin";
import { sendInviteEmail } from "@/lib/email";
import { getHouseDisplayName } from "@/lib/house-name";
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
  const session = await requireUserSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "user", label: "createUserAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", label: "createUserAction" },
      });
    } catch {}
    return { ok: false, error: "Only a super admin can invite roommates" };
  }
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", label: "createUserAction" },
        newValue: toAuditJson({ issues: parsed.error.issues }),
      });
    } catch {}
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await createUser(parsed.data);
    let inviteEmailSent = false;
    try {
      const houseName = await getHouseDisplayName();
      await sendInviteEmail({
        to: data.email,
        name: data.name,
        houseName,
      });
      inviteEmailSent = true;
    } catch (e) {
      console.error("[invite] failed to send invite email", e);
    }
    try {
      await appendAuditLog({
        actionType: "CREATE_USER",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: data._id, label: data.name },
        newValue: toAuditJson({
          ...data,
          inviteEmailSent,
        }),
      });
    } catch (e) {
      console.error("[audit] create user", e);
    }
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    revalidatePath("/audit-logs");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", label: "createUserAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: e instanceof Error ? e.message : "Could not invite roommate" };
  }
}

export async function updateUserAction(input: UpdateUserInput): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof updateUser>>>>> {
  const session = await requireUserSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "user", label: "updateUserAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", label: "updateUserAction" },
      });
    } catch {}
    return { ok: false, error: "Only a super admin can edit roommates" };
  }
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    try {
      await appendAuditLog({
        actionType: "VALIDATION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: input.id, label: "updateUserAction" },
        newValue: toAuditJson({ issues: parsed.error.issues }),
      });
    } catch {}
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
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id: input.id, label: "updateUserAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: e instanceof Error ? e.message : "Could not update roommate" };
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<null>> {
  const session = await requireUserSession();
  if (!session) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerAnonymous(),
        targetEntity: { type: "user", id, label: "deleteUserAction" },
      });
    } catch {}
    return { ok: false, error: "Unauthorized" };
  }
  if (!isAdminSession(session)) {
    try {
      await appendAuditLog({
        actionType: "ACCESS_DENIED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id, label: "deleteUserAction" },
      });
    } catch {}
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
    try {
      await appendAuditLog({
        actionType: "ACTION_FAILED",
        performedBy: performerFromSession(session),
        targetEntity: { type: "user", id, label: "deleteUserAction" },
        newValue: toAuditJson({ error: e instanceof Error ? e.message : "unknown" }),
      });
    } catch {}
    return { ok: false, error: "Could not delete roommate" };
  }
}
