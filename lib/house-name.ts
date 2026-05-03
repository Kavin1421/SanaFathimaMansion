import { connectDb } from "@/lib/db";
import { HouseSettings } from "@/models/HouseSettings";

const FALLBACK = "SanaFathima Mansion";

/** Resolution order: DB HouseSettings → NEXT_PUBLIC_HOUSE_NAME → fallback */
export async function getHouseDisplayName(): Promise<string> {
  await connectDb();
  const doc = await HouseSettings.findOne({ key: "default" }).lean();
  if (doc?.displayName?.trim()) return doc.displayName.trim();
  return process.env.NEXT_PUBLIC_HOUSE_NAME?.trim() || FALLBACK;
}
