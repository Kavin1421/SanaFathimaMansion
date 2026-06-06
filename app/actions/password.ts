"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import {
  changeAccountPassword,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/services/password-reset";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<ActionResult<{ sent: boolean }>> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const created = await createPasswordResetToken(parsed.data.email);
    if (created) {
      try {
        await sendPasswordResetEmail({ to: created.email, token: created.token });
      } catch (e) {
        console.error("[password-reset] email failed", e);
        return { ok: false, error: "Could not send reset email. Check email configuration." };
      }
    }
    // Always return success to avoid email enumeration
    return { ok: true, data: { sent: true } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not process reset request" };
  }
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
}): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!ok) return { ok: false, error: "Reset link is invalid or expired" };
  return { ok: true, data: null };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<null>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const result = await changeAccountPassword(
    session.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/profile");
  return { ok: true, data: null };
}
