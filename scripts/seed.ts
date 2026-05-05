/**
 * MongoDB seed with selectable modes (interactive menu or CLI).
 *
 * - Full demo: wipes listed collections, then inserts house, ledger users, demo +
 *   super-admin accounts, month budget, sample expenses, one settlement, recompute.
 * - Super admin only: upserts the super-admin Account (no deletes). Optionally links
 *   ledgerUserId to a user named "Kevin" if one exists.
 *
 * CLI: `npm run seed -- full` | `npm run seed -- admin`
 * Interactive: `npm run seed` (prompts when stdin is a TTY).
 * Non-TTY: defaults to `full` (pass `admin` explicitly if needed).
 */
import { config } from "dotenv";
import { stdin as input, stdout as output } from "process";
import { resolve } from "path";
import * as readline from "readline/promises";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "../lib/db";
import { Account } from "../models/Account";
import { AuditLog } from "../models/AuditLog";
import { Expense } from "../models/Expense";
import { HouseMonth } from "../models/HouseMonth";
import { HouseSettings } from "../models/HouseSettings";
import { Settlement } from "../models/Settlement";
import { User } from "../models/User";
import { recomputeAllUserBalances } from "../services/recompute";

config({ path: resolve(process.cwd(), ".env.local") });

type SeedMode = "full" | "admin";

function parseModeFromArgv(): SeedMode | null {
  const args = process.argv.slice(2);
  for (const a of args) {
    const n = a.toLowerCase();
    if (n === "--full" || n === "-f") return "full";
    if (n === "--admin" || n === "-a") return "admin";
  }
  const positional = args.find((x) => !x.startsWith("-"));
  if (!positional) return null;
  const n = positional.toLowerCase();
  switch (n) {
    case "full":
    case "1":
    case "demo":
    case "all":
      return "full";
    case "admin":
    case "2":
    case "admin-only":
    case "superadmin":
      return "admin";
    default:
      console.error(`Unknown seed mode "${positional}". Use: full | admin`);
      process.exit(1);
  }
}

async function promptMode(): Promise<SeedMode> {
  const rl = readline.createInterface({ input, output });
  console.log("\n── Seed ──");
  console.log("  1) Full demo seed — clears expenses, settlements, ledger users, accounts, house settings, house months; then loads sample data + demo user + super admin");
  console.log("  2) Super admin only — upsert super-admin account only (no data deleted). Password from SEED_ADMIN_PASSWORD; links to ledger user “Kevin” if present");
  const raw = (await rl.question("\nEnter 1 or 2 [1]: ")).trim();
  rl.close();
  switch (raw) {
    case "2":
      return "admin";
    case "":
    case "1":
      return "full";
    default:
      console.error("Invalid choice. Run again and enter 1 or 2.");
      process.exit(1);
  }
}

async function resolveMode(): Promise<SeedMode> {
  const fromArgv = parseModeFromArgv();
  if (fromArgv) return fromArgv;
  if (!input.isTTY) {
    console.log("Non-interactive shell: using full demo seed. For admin-only: npm run seed -- admin");
    return "full";
  }
  return promptMode();
}

async function seedAdminOnly() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "kkavinkumar24@gmail.com").toLowerCase();

  const kevin = await User.findOne({ name: /^kevin$/i });
  const setDoc: Record<string, unknown> = {
    email: superEmail,
    name: "Super Admin",
    passwordHash: adminHash,
    onboardingCompleted: true,
    role: "admin",
  };
  if (kevin) setDoc.ledgerUserId = kevin._id;

  await Account.updateOne({ email: superEmail }, { $set: setDoc }, { upsert: true });

  console.log("Super admin upserted (no collections were cleared).");
  console.log(`  Email: ${superEmail}`);
  console.log(`  Password: ${adminPassword} (override with SEED_ADMIN_PASSWORD)`);
  if (kevin) console.log(`  Linked ledger user: ${kevin.name} (${kevin._id})`);
  else console.log("  ledgerUserId: not set (no user named “Kevin” found — add one in app or run full seed)");
}

async function seedFull() {
  console.log("Full seed: clearing collections, then inserting demo data…");
  await Promise.all([
    Expense.deleteMany({}),
    Settlement.deleteMany({}),
    User.deleteMany({}),
    Account.deleteMany({}),
    HouseSettings.deleteMany({}),
    HouseMonth.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const demoPassword = "Demo12345!";
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "kavinkumar24@gmail.com").toLowerCase();

  await HouseSettings.create({
    key: "default",
    displayName: "Sana Fathima Mansion",
  });

  const users = await User.insertMany([
    { name: "Kevin", email: "kevin@sana.local", status: "active", totalPaid: 0, balance: 0 },
    { name: "Dilip", email: "dilip@sana.local", status: "active", totalPaid: 0, balance: 0 },
    { name: "Fathima", email: "fathima@sana.local", status: "active", totalPaid: 0, balance: 0 },
    { name: "Arun", email: "arun@sana.local", status: "active", totalPaid: 0, balance: 0 },
  ]);

  const [kevin, dilip, fathima, arun] = users;

  await Account.insertMany([
    {
      email: "demo@sana.local",
      name: "Demo User",
      passwordHash,
      onboardingCompleted: true,
      role: "user",
    },
    {
      email: superEmail,
      name: "Super Admin",
      passwordHash: adminHash,
      onboardingCompleted: true,
      role: "admin",
      ledgerUserId: kevin._id,
    },
  ]);
  const allIds = [kevin._id, dilip._id, fathima._id, arun._id];

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const d = (day: number, monthOffset = 0) => new Date(y, m + monthOffset, day);

  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  await HouseMonth.create({
    monthKey,
    budget: 30_000,
    carryForwardBalances: true,
  });

  await Expense.insertMany([
    {
      title: "March rent",
      amount: 24000,
      category: "Rent",
      paidBy: kevin._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(5, -1),
      notes: "Landlord transfer",
    },
    {
      title: "Groceries — big shop",
      amount: 4200,
      category: "Groceries",
      paidBy: dilip._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(8, -1),
    },
    {
      title: "LPG refill",
      amount: 1100,
      category: "Gas",
      paidBy: fathima._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(14, -1),
    },
    {
      title: "Vegetables",
      amount: 850,
      category: "Vegetables",
      paidBy: arun._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(18, -1),
    },
    {
      title: "April rent",
      amount: 24000,
      category: "Rent",
      paidBy: kevin._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(3, 0),
    },
    {
      title: "Monthly groceries",
      amount: 5100,
      category: "Groceries",
      paidBy: dilip._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(7, 0),
    },
    {
      title: "Snacks & misc",
      amount: 620,
      category: "Misc",
      paidBy: fathima._id,
      splitEnabled: true,
      splitBetween: [kevin._id, dilip._id, fathima._id],
      date: d(12, 0),
    },
    {
      title: "Farm vegetables",
      amount: 450,
      category: "Vegetables",
      paidBy: arun._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(15, 0),
    },
    {
      title: "Cooking gas",
      amount: 1050,
      category: "Gas",
      paidBy: kevin._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(20, 0),
    },
    {
      title: "Internet",
      amount: 1499,
      category: "Misc",
      paidBy: dilip._id,
      splitEnabled: true,
      splitBetween: allIds,
      date: d(22, 0),
    },
  ]);

  await Settlement.create({
    fromUser: dilip._id,
    toUser: kevin._id,
    amount: 2000,
    date: d(25, -1),
    status: "completed",
  });

  await recomputeAllUserBalances();
  console.log("Seed complete. Ledger users:", users.map((u) => u.name).join(", "));
  console.log(`Demo user: demo@sana.local / ${demoPassword} (onboarding skipped)`);
  console.log(`Super admin: ${superEmail} / ${adminPassword} (set SEED_ADMIN_PASSWORD to override)`);
  console.log(`House month ${monthKey} budget: ₹30,000`);
}

async function main() {
  if (!process.env.MONGO_URL) {
    console.error("Set MONGO_URL in .env.local");
    process.exit(1);
  }

  await connectDb();
  const mode = await resolveMode();

  switch (mode) {
    case "admin":
      await seedAdminOnly();
      break;
    case "full":
      await seedFull();
      break;
    default: {
      const _exhaustive: never = mode;
      console.error("Unhandled mode", _exhaustive);
      process.exit(1);
    }
  }

  await mongoose.connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
