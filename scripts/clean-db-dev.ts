/**
 * Dev/staging only: wipe expenses, settlements, logs, months, notification events,
 * house settings, and all Accounts/Users except one preserved login.
 *
 * Does NOT run unless ALLOW_DB_CLEAN=true (blocks VERCEL_ENV=production).
 *
 * Usage:
 *   ALLOW_DB_CLEAN=true npm run db:clean:dev
 *
 * Preserve a specific login (defaults to SUPER_ADMIN_EMAIL, then kkavinkumar24@gmail.com):
 *   PRESERVE_ACCOUNT_EMAIL=you@domain.com ALLOW_DB_CLEAN=true npm run db:clean:dev
 */
import { config } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";
import { connectDb } from "../lib/db";
import { Account } from "../models/Account";
import { AuditLog } from "../models/AuditLog";
import { Expense } from "../models/Expense";
import { HouseMonth } from "../models/HouseMonth";
import { HouseSettings } from "../models/HouseSettings";
import { NotificationEvent } from "../models/NotificationEvent";
import { Settlement } from "../models/Settlement";
import { User } from "../models/User";
import { recomputeAllUserBalances } from "../services/recompute";

config({ path: resolve(process.cwd(), ".env.local") });

function preserveEmail(): string {
  const raw =
    process.env.PRESERVE_ACCOUNT_EMAIL?.trim() ||
    process.env.SUPER_ADMIN_EMAIL?.trim() ||
    "kkavinkumar24@gmail.com";
  return raw.toLowerCase();
}

function assertSafeToRun(): void {
  if (process.env.ALLOW_DB_CLEAN !== "true") {
    console.error(
      "\nRefusing: set ALLOW_DB_CLEAN=true (local/staging only).\n  Example: ALLOW_DB_CLEAN=true npm run db:clean:dev\n",
    );
    process.exit(1);
  }
  if (process.env.VERCEL_ENV === "production") {
    console.error("\nRefusing: VERCEL_ENV is production.\n");
    process.exit(1);
  }
}

async function main() {
  assertSafeToRun();

  if (!process.env.MONGO_URL) {
    console.error("Set MONGO_URL in .env.local");
    process.exit(1);
  }

  const email = preserveEmail();
  await connectDb();

  const account = await Account.findOne({ email }).lean();
  if (!account) {
    console.error(
      `No Account found for ${email}. Sign up once or set PRESERVE_ACCOUNT_EMAIL / SUPER_ADMIN_EMAIL.`,
    );
    process.exit(1);
  }

  console.log(`Cleaning database — preserving login ${email} …`);

  await Promise.all([
    Expense.deleteMany({}),
    Settlement.deleteMany({}),
    NotificationEvent.deleteMany({}),
    AuditLog.deleteMany({}),
    HouseMonth.deleteMany({}),
  ]);

  let ledgerId = account.ledgerUserId ?? undefined;
  if (ledgerId && !(await User.exists({ _id: ledgerId }))) {
    console.warn("Preserved account had stale ledgerUserId; clearing link.");
    await Account.updateOne({ _id: account._id }, { $unset: { ledgerUserId: "" } });
    ledgerId = undefined;
  }

  await User.deleteMany(ledgerId ? { _id: { $ne: ledgerId } } : {});
  await Account.deleteMany({ email: { $ne: email } });

  if (ledgerId) {
    await User.updateOne(
      { _id: ledgerId },
      {
        $set: {
          totalPaid: 0,
          balance: 0,
          status: "active",
          activatedAt: new Date(),
        },
      },
    );
  } else {
    const created = await User.create({
      name: account.name?.trim() || "Household member",
      email,
      status: "active",
      activatedAt: new Date(),
      reminderPreferences: {
        frequency: "daily",
        channels: { email: true, telegram: true },
        quietHours: { startHour: 22, endHour: 8 },
      },
      totalPaid: 0,
      balance: 0,
    });
    ledgerId = created._id;
    await Account.updateOne({ _id: account._id }, { $set: { ledgerUserId: ledgerId } });
    console.log(`Linked new ledger User to preserved Account.`);
  }

  await HouseSettings.deleteMany({});
  const displayName =
    process.env.NEXT_PUBLIC_HOUSE_NAME?.trim() || "Sana Fathima Mansion";
  await HouseSettings.create({
    key: "default",
    displayName: displayName,
  });

  await recomputeAllUserBalances();

  console.log("\nDone. Ledger and transactional data cleared.");
  console.log(`  Preserved Account: ${email}`);
  console.log(`  Ledger User id: ${String(ledgerId)}`);
  console.log(`  House name reset to: ${displayName}`);
  console.log("\nProduction safety: this script refuses to run without ALLOW_DB_CLEAN=true and blocks VERCEL_ENV=production.");

  await mongoose.connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
