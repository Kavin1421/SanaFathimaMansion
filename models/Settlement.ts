import mongoose, { Schema, type Model, type Types } from "mongoose";

export type SettlementDocument = {
  _id: Types.ObjectId;
  fromUser: Types.ObjectId;
  toUser: Types.ObjectId;
  amount: number;
  date: Date;
  status: "pending" | "completed" | "confirmed";
  confirmedBy?: Types.ObjectId;
  confirmedAt?: Date;
};

const settlementSchema = new Schema<SettlementDocument>(
  {
    fromUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    status: { type: String, enum: ["pending", "completed", "confirmed"], default: "pending" },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "Account" },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

settlementSchema.index({ date: -1 });
settlementSchema.index({ status: 1 });

export const Settlement: Model<SettlementDocument> =
  mongoose.models.Settlement ??
  mongoose.model<SettlementDocument>("Settlement", settlementSchema);
