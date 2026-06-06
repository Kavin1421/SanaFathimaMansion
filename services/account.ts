import { connectDb } from "@/lib/db";
import type { RegisterAccountInput, UpdateAccountProfileInput } from "@/lib/validation";
import { Account } from "@/models/Account";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";

export type AccountProfileDTO = {
  id: string;
  name: string;
  email: string;
  image?: string;
  ledgerUserId?: string;
};

function toProfileDTO(acc: {
  _id: { toString(): string };
  name: string;
  email: string;
  image?: string;
  ledgerUserId?: { toString(): string };
}): AccountProfileDTO {
  return {
    id: acc._id.toString(),
    name: acc.name,
    email: acc.email,
    image: acc.image,
    ledgerUserId: acc.ledgerUserId?.toString(),
  };
}

export async function getAccountProfile(accountId: string): Promise<AccountProfileDTO | null> {
  await connectDb();
  const acc = await Account.findById(accountId).select("name email image ledgerUserId").lean();
  if (!acc) return null;
  return toProfileDTO(acc);
}

export async function updateAccountProfile(
  accountId: string,
  input: UpdateAccountProfileInput,
): Promise<AccountProfileDTO | null> {
  await connectDb();
  const name = input.name.trim();
  const imageProvided = input.image !== undefined;
  const imageValue =
    input.image === null || (typeof input.image === "string" && input.image.trim() === "")
      ? null
      : input.image?.trim();

  const accountUpdate: Record<string, unknown> = { name };
  const accountUnset: Record<string, 1> = {};
  if (imageProvided) {
    if (imageValue) {
      accountUpdate.image = imageValue;
    } else {
      accountUnset.image = 1;
    }
  }

  const mongoAccountUpdate: Record<string, unknown> =
    Object.keys(accountUnset).length > 0
      ? { $set: accountUpdate, $unset: accountUnset }
      : { $set: accountUpdate };

  const acc = await Account.findByIdAndUpdate(accountId, mongoAccountUpdate, { new: true })
    .select("name email image ledgerUserId")
    .lean();
  if (!acc) return null;

  if (acc.ledgerUserId) {
    const userUpdate: Record<string, unknown> = { name };
    const userUnset: Record<string, 1> = {};
    if (imageProvided) {
      if (imageValue) {
        userUpdate.avatar = imageValue;
      } else {
        userUnset.avatar = 1;
      }
    }
    const mongoUserUpdate: Record<string, unknown> =
      Object.keys(userUnset).length > 0
        ? { $set: userUpdate, $unset: userUnset }
        : { $set: userUpdate };
    await User.findByIdAndUpdate(acc.ledgerUserId, mongoUserUpdate);
  }

  return toProfileDTO(acc);
}

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
