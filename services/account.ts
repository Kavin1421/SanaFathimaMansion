import { connectDb } from "@/lib/db";
import type { RegisterAccountInput } from "@/lib/validation";
import { Account } from "@/models/Account";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";

export async function registerAccount(input: RegisterAccountInput): Promise<{ id: string }> {
  await connectDb();
  const email = input.email.toLowerCase().trim();
  const existing = await Account.findOne({ email });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const invitedUser = await User.findOne({ email }).lean();
  const doc = await Account.create({
    email,
    name: input.name.trim(),
    passwordHash,
    onboardingCompleted: false,
    role: "user",
    ...(invitedUser ? { ledgerUserId: invitedUser._id } : {}),
  });
  if (invitedUser) {
    await User.updateOne(
      { _id: invitedUser._id },
      { $set: { status: "active", activatedAt: new Date() } },
    );
  }
  return { id: doc._id.toString() };
}

export async function setOnboardingCompleted(accountId: string, completed: boolean): Promise<void> {
  await connectDb();
  await Account.findByIdAndUpdate(accountId, { onboardingCompleted: completed });
}
