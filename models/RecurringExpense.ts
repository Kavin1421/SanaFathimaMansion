import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export type RecurringExpenseDocument = {
  _id: Types.ObjectId;
  title: string;
  amount: number;
  category: (typeof EXPENSE_CATEGORIES)[number];
  paidBy: Types.ObjectId;
  splitEnabled: boolean;
  splitMode: "equal" | "custom";
  splitBetween: Types.ObjectId[];
  dayOfMonth: number;
  active: boolean;
  lastPostedMonthKey?: string;
  createdBy: string;
};

const recurringExpenseSchema = new Schema<RecurringExpenseDocument>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: [...EXPENSE_CATEGORIES] },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    splitEnabled: { type: Boolean, default: true },
    splitMode: { type: String, enum: ["equal", "custom"], default: "equal" },
    splitBetween: [{ type: Schema.Types.ObjectId, ref: "User" }],
    dayOfMonth: { type: Number, required: true, min: 1, max: 28 },
    active: { type: Boolean, default: true },
    lastPostedMonthKey: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const RecurringExpense: Model<RecurringExpenseDocument> =
  mongoose.models.RecurringExpense ??
  mongoose.model<RecurringExpenseDocument>("RecurringExpense", recurringExpenseSchema);
