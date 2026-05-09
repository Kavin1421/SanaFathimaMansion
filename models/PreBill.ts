import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export type PreBillStatus = "draft" | "finalized";

export type PreBillItemSubdoc = {
  name: string;
  quantity: number;
  unit: "kg" | "g" | "L" | "pcs";
  price?: number;
};

export type PreBillDocument = {
  _id: Types.ObjectId;
  title: string;
  category: (typeof EXPENSE_CATEGORIES)[number];
  notes?: string;
  createdBy: Types.ObjectId;
  items: PreBillItemSubdoc[];
  status: PreBillStatus;
  linkedExpenseId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const preBillItemSchema = new Schema<PreBillItemSubdoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: ["kg", "g", "L", "pcs"] },
    price: { type: Number, min: 0 },
  },
  { _id: false },
);

const preBillSchema = new Schema<PreBillDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, required: true, enum: [...EXPENSE_CATEGORIES] },
    notes: { type: String, maxlength: 4000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [preBillItemSchema], default: [] },
    status: { type: String, enum: ["draft", "finalized"], default: "draft" },
    linkedExpenseId: { type: Schema.Types.ObjectId, ref: "Expense" },
  },
  { timestamps: true, collection: "preBills" },
);

preBillSchema.index({ status: 1, updatedAt: -1 });
preBillSchema.index({ createdBy: 1, updatedAt: -1 });

export const PreBill: Model<PreBillDocument> =
  mongoose.models.PreBill ?? mongoose.model<PreBillDocument>("PreBill", preBillSchema);
