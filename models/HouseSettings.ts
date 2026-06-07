import mongoose, { Schema, type Model, type Types } from "mongoose";

export type HouseSettingsDocument = {
  _id: Types.ObjectId;
  key: string;
  displayName: string;
  budgetThresholdWarn?: number;
  budgetThresholdOver?: number;
  overspendAcknowledgedMonthKey?: string;
};

const houseSettingsSchema = new Schema<HouseSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    displayName: { type: String, required: true, trim: true },
    budgetThresholdWarn: { type: Number, min: 0, max: 1, default: 0.8 },
    budgetThresholdOver: { type: Number, min: 0, max: 1, default: 1 },
    overspendAcknowledgedMonthKey: { type: String },
  },
  { timestamps: true },
);

export const HouseSettings: Model<HouseSettingsDocument> =
  mongoose.models.HouseSettings ??
  mongoose.model<HouseSettingsDocument>("HouseSettings", houseSettingsSchema);
