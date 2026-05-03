import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export type ExpenseDocument = {
  _id: Types.ObjectId;
  title: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  paidBy: Types.ObjectId;
  splitEnabled: boolean;
  splitBetween: Types.ObjectId[];
  date: Date;
  notes?: string;
  description?: string;
  billImage?: string;
};

const expenseSchema = new Schema<ExpenseDocument>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: [...EXPENSE_CATEGORIES] },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    splitEnabled: { type: Boolean, default: true },
    splitBetween: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    date: { type: Date, required: true },
    notes: { type: String },
    description: { type: String },
    billImage: { type: String },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ date: -1, category: 1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ title: "text", notes: "text", description: "text" });

export const Expense: Model<ExpenseDocument> =
  mongoose.models.Expense ?? mongoose.model<ExpenseDocument>("Expense", expenseSchema);
