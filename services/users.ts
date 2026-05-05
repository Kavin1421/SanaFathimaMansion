import { connectDb } from "@/lib/db";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation";
import { Account } from "@/models/Account";
import { Expense } from "@/models/Expense";
import { User } from "@/models/User";
import type { UserDTO } from "@/types";
function toDTO(u: {
  _id: { toString(): string };
  name: string;
  email: string;
  status: "invited" | "active" | "disabled";
  avatar?: string;
  totalPaid: number;
  balance: number;
}): UserDTO {
  return {
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    status: u.status,
    avatar: u.avatar,
    totalPaid: u.totalPaid,
    balance: u.balance,
  };
}

export async function getUserById(id: string): Promise<UserDTO | null> {
  await connectDb();
  const u = await User.findById(id).lean();
  if (!u) return null;
  return toDTO({
    _id: u._id,
    name: u.name,
    email: u.email,
    status: u.status,
    avatar: u.avatar,
    totalPaid: u.totalPaid,
    balance: u.balance,
  });
}

export async function listUsers(): Promise<UserDTO[]> {
  await connectDb();
  const users = await User.find().sort({ name: 1 }).lean();
  return users.map((u) =>
    toDTO({
      _id: u._id,
      name: u.name,
      email: u.email,
      status: u.status,
      avatar: u.avatar,
      totalPaid: u.totalPaid,
      balance: u.balance,
    }),
  );
}

export async function createUser(input: CreateUserInput): Promise<UserDTO> {
  await connectDb();
  const email = input.email.toLowerCase().trim();
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new Error("A roommate with this email already exists.");
  }
  const existingAccount = await Account.findOne({ email }).lean();
  if (existingAccount?.ledgerUserId) {
    throw new Error("This email is already linked to an existing account.");
  }
  const avatar =
    input.avatar && input.avatar.trim().length > 0 ? input.avatar.trim() : undefined;
  const doc = await User.create({
    name: input.name.trim(),
    email,
    status: "invited",
    invitedAt: new Date(),
    avatar,
    totalPaid: 0,
    balance: 0,
  });
  return toDTO(doc);
}

export async function updateUser(input: UpdateUserInput): Promise<UserDTO | null> {
  await connectDb();
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.email !== undefined) {
    const email = input.email.toLowerCase().trim();
    const existing = await User.findOne({ email, _id: { $ne: input.id } }).lean();
    if (existing) {
      throw new Error("Another roommate already uses this email.");
    }
    updates.email = email;
  }
  if (input.avatar !== undefined) {
    updates.avatar = input.avatar.trim().length > 0 ? input.avatar.trim() : undefined;
  }
  const doc = await User.findByIdAndUpdate(input.id, updates, { new: true }).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    status: doc.status,
    avatar: doc.avatar,
    totalPaid: doc.totalPaid,
    balance: doc.balance,
  });
}

export async function deleteUser(id: string): Promise<{ ok: boolean; error?: string }> {
  await connectDb();
  const oid = id;
  const [asPayer, asSplit] = await Promise.all([
    Expense.countDocuments({ paidBy: oid }),
    Expense.countDocuments({ splitBetween: oid }),
  ]);
  if (asPayer > 0 || asSplit > 0) {
    return { ok: false, error: "Remove or reassign expenses before deleting this roommate." };
  }
  await User.deleteOne({ _id: oid });
  return { ok: true };
}

export async function activateInvitedUserByEmail(emailInput: string): Promise<UserDTO | null> {
  await connectDb();
  const email = emailInput.toLowerCase().trim();
  const doc = await User.findOneAndUpdate(
    { email },
    { $set: { status: "active", activatedAt: new Date() } },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toDTO({
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    status: doc.status,
    avatar: doc.avatar,
    totalPaid: doc.totalPaid,
    balance: doc.balance,
  });
}
