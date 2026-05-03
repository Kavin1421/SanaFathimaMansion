/**
 * One-off: set splitEnabled: true on expenses missing the field.
 * Run: npx tsx scripts/migrate-expenses-split.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { connectDb } from "../lib/db";
import { Expense } from "../models/Expense";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!process.env.MONGO_URL) {
    console.error("Set MONGO_URL in .env.local");
    process.exit(1);
  }
  await connectDb();
  const res = await Expense.updateMany(
    { $or: [{ splitEnabled: { $exists: false } }, { splitEnabled: null }] },
    { $set: { splitEnabled: true } },
  );
  console.log("Updated expenses:", res.modifiedCount);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
