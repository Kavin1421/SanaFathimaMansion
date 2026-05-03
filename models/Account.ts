import mongoose, { Schema, type Model, type Types } from "mongoose";

export type AccountDocument = {
  _id: Types.ObjectId;
  email: string;
  passwordHash?: string;
  name: string;
  image?: string;
  googleId?: string;
  emailVerified?: Date;
  onboardingCompleted: boolean;
};

const accountSchema = new Schema<AccountDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    googleId: { type: String, sparse: true, unique: true },
    emailVerified: { type: Date },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Account: Model<AccountDocument> =
  mongoose.models.Account ?? mongoose.model<AccountDocument>("Account", accountSchema);
