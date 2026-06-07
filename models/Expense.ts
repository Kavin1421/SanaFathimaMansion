import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export type ExpenseComment = {
  _id: Types.ObjectId;
  accountId: string;
  authorName: string;
  text: string;
  createdAt: Date;
};

export type ExpenseReaction = {
  emoji: string;
  accountId: string;
  authorName: string;
  createdAt: Date;
};

export type ExpenseDocument = {
  _id: Types.ObjectId;
  title: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  paidBy: Types.ObjectId;
  splitEnabled: boolean;
  splitMode?: "equal" | "custom";
  splitBetween: Types.ObjectId[];
  splitAmounts?: { userId: Types.ObjectId; amount: number }[];
  date: Date;
  notes?: string;
  description?: string;
  billImage?: string;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  currency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  comments: ExpenseComment[];
  reactions: ExpenseReaction[];
};

const expenseCommentSchema = new Schema<ExpenseComment>(
  {
    accountId: { type: String, required: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 800 },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true },
);

const expenseReactionSchema = new Schema<ExpenseReaction>(
  {
    emoji: { type: String, required: true, trim: true, maxlength: 8 },
    accountId: { type: String, required: true },
    authorName: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const expenseSchema = new Schema<ExpenseDocument>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: [...EXPENSE_CATEGORIES] },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    splitEnabled: { type: Boolean, default: true },
    splitMode: { type: String, enum: ["equal", "custom"], default: "equal" },
    splitBetween: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    splitAmounts: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    date: { type: Date, required: true },
    notes: { type: String },
    description: { type: String },
    billImage: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    rejectionReason: { type: String },
    currency: { type: String, default: "INR" },
    originalAmount: { type: Number },
    exchangeRate: { type: Number },
    comments: { type: [expenseCommentSchema], default: [] },
    reactions: { type: [expenseReactionSchema], default: [] },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ date: -1, category: 1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ title: "text", notes: "text", description: "text" });

export const Expense: Model<ExpenseDocument> =
  mongoose.models.Expense ?? mongoose.model<ExpenseDocument>("Expense", expenseSchema);
