import mongoose, { Schema, type Model, type Types } from "mongoose";

export type HouseSettingsDocument = {
  _id: Types.ObjectId;
  key: string;
  displayName: string;
};

const houseSettingsSchema = new Schema<HouseSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    displayName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const HouseSettings: Model<HouseSettingsDocument> =
  mongoose.models.HouseSettings ??
  mongoose.model<HouseSettingsDocument>("HouseSettings", houseSettingsSchema);
