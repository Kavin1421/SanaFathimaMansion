"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validation";
import { createUser, deleteUser, updateUser } from "@/services/users";

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
  if (!(await requireUserSession())) {
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  try {
    const data = await updateUser(parsed.data);
    if (!data) return { ok: false, error: "User not found" };
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not update roommate" };
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<null>> {
  if (!(await requireUserSession())) {
    return { ok: false, error: "Unauthorized" };
  }
  try {
    const res = await deleteUser(id);
    if (!res.ok) return { ok: false, error: res.error ?? "Delete failed" };
    revalidatePath("/dashboard");
    revalidatePath("/users");
    revalidatePath("/expenses");
    return { ok: true, data: null };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not delete roommate" };
  }
}
