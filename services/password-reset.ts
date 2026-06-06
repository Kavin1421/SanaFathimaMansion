import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { Account } from "@/models/Account";
import { PasswordResetToken } from "@/models/PasswordResetToken";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(emailInput: string): Promise<{ token: string; email: string } | null> {
  await connectDb();
  const email = emailInput.toLowerCase().trim();
  const acc = await Account.findOne({ email }).select("_id passwordHash").lean();
  if (!acc?.passwordHash) return null;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await PasswordResetToken.deleteMany({ accountId: acc._id, usedAt: { $exists: false } });
  await PasswordResetToken.create({
    accountId: acc._id,
    tokenHash,
    expiresAt,
  });

  return { token: rawToken, email };
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  await connectDb();
  const tokenHash = hashToken(token.trim());
  const row = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!row) return false;

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await Account.findByIdAndUpdate(row.accountId, { $set: { passwordHash } });
  await PasswordResetToken.updateOne({ _id: row._id }, { $set: { usedAt: new Date() } });
  return true;
}

export async function changeAccountPassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDb();
  const acc = await Account.findById(accountId).select("passwordHash").lean();
  if (!acc?.passwordHash) {
    return { ok: false, error: "Password sign-in is not enabled for this account" };
  }
  const matches = await bcrypt.compare(currentPassword, acc.passwordHash);
  if (!matches) return { ok: false, error: "Current password is incorrect" };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await Account.findByIdAndUpdate(accountId, { $set: { passwordHash } });
  return { ok: true };
}
