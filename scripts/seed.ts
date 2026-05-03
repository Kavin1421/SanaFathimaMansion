/**
 * Loads `.env.local` then seeds MongoDB with demo roommates and expenses.
 * Run: `npm run seed`
 */
import { config } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";
import { connectDb } from "../lib/db";
import { Expense } from "../models/Expense";
import { Settlement } from "../models/Settlement";
import { User } from "../models/User";
import { recomputeAllUserBalances } from "../services/recompute";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!process.env.MONGO_URL) {
    console.error("Set MONGO_URL in .env.local");
    process.exit(1);
  }

  await connectDb();
  console.log("Connected. Clearing collections…");
  await Promise.all([Expense.deleteMany({}), Settlement.deleteMany({}), User.deleteMany({})]);

  const users = await User.insertMany([
    { name: "Kevin", totalPaid: 0, balance: 0 },
    { name: "Dilip", totalPaid: 0, balance: 0 },
    { name: "Fathima", totalPaid: 0, balance: 0 },
    { name: "Arun", totalPaid: 0, balance: 0 },
  ]);

  const [kevin, dilip, fathima, arun] = users;
  const allIds = [kevin._id, dilip._id, fathima._id, arun._id];

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const d = (day: number, monthOffset = 0) => new Date(y, m + monthOffset, day);

  await Expense.insertMany([
    {
      title: "March rent",
      amount: 24000,
      category: "Rent",
      paidBy: kevin._id,
      splitBetween: allIds,
      date: d(5, -1),
      notes: "Landlord transfer",
    },
    {
      title: "Groceries — big shop",
      amount: 4200,
      category: "Groceries",
      paidBy: dilip._id,
      splitBetween: allIds,
      date: d(8, -1),
    },
    {
      title: "LPG refill",
      amount: 1100,
      category: "Gas",
      paidBy: fathima._id,
      splitBetween: allIds,
      date: d(14, -1),
    },
    {
      title: "Vegetables",
      amount: 850,
      category: "Vegetables",
      paidBy: arun._id,
      splitBetween: allIds,
      date: d(18, -1),
    },
    {
      title: "April rent",
      amount: 24000,
      category: "Rent",
      paidBy: kevin._id,
      splitBetween: allIds,
      date: d(3, 0),
    },
    {
      title: "Monthly groceries",
      amount: 5100,
      category: "Groceries",
      paidBy: dilip._id,
      splitBetween: allIds,
      date: d(7, 0),
    },
    {
      title: "Snacks & misc",
      amount: 620,
      category: "Misc",
      paidBy: fathima._id,
      splitBetween: [kevin._id, dilip._id, fathima._id],
      date: d(12, 0),
    },
    {
      title: "Farm vegetables",
      amount: 450,
      category: "Vegetables",
      paidBy: arun._id,
      splitBetween: allIds,
      date: d(15, 0),
    },
    {
      title: "Cooking gas",
      amount: 1050,
      category: "Gas",
      paidBy: kevin._id,
      splitBetween: allIds,
      date: d(20, 0),
    },
    {
      title: "Internet",
      amount: 1499,
      category: "Misc",
      paidBy: dilip._id,
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
  console.log("Seed complete. Users:", users.map((u) => u.name).join(", "));
  await mongoose.connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
