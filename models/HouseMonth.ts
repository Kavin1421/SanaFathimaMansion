import mongoose, { Schema, type Model, type Types } from "mongoose";

export type HouseMonthDocument = {
  _id: Types.ObjectId;
  monthKey: string;
  budget: number;
  carryForwardBalances: boolean;
};

const houseMonthSchema = new Schema<HouseMonthDocument>(
  {
    monthKey: { type: String, required: true, unique: true, trim: true },
    budget: { type: Number, required: true, min: 0 },
    carryForwardBalances: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const HouseMonth: Model<HouseMonthDocument> =
  mongoose.models.HouseMonth ?? mongoose.model<HouseMonthDocument>("HouseMonth", houseMonthSchema);
