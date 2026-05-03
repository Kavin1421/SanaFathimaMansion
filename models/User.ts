import mongoose, { Schema, type Model, type Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  name: string;
  avatar?: string;
  totalPaid: number;
  balance: number;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    avatar: { type: String },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ name: 1 });

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
