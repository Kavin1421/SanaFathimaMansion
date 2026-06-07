import mongoose, { Schema, type Model, type Types } from "mongoose";

export type SavingsGoalDocument = {
  _id: Types.ObjectId;
  title: string;
  targetAmount: number;
  currentAmount: number;
  createdBy: string;
  active: boolean;
};

const savingsGoalSchema = new Schema<SavingsGoalDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    targetAmount: { type: Number, required: true, min: 1 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    createdBy: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const SavingsGoal: Model<SavingsGoalDocument> =
  mongoose.models.SavingsGoal ??
  mongoose.model<SavingsGoalDocument>("SavingsGoal", savingsGoalSchema);
