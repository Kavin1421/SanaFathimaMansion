import mongoose, { Schema, type Model, type Types } from "mongoose";

export type AccountRole = "admin" | "user";

export type AccountDocument = {
  _id: Types.ObjectId;
  email: string;
  passwordHash?: string;
  name: string;
  image?: string;
  googleId?: string;
  emailVerified?: Date;
  onboardingCompleted: boolean;
  role: AccountRole;
  ledgerUserId?: Types.ObjectId;
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
    role: { type: String, enum: ["admin", "user"], default: "user" },
    ledgerUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Account: Model<AccountDocument> =
  mongoose.models.Account ?? mongoose.model<AccountDocument>("Account", accountSchema);
