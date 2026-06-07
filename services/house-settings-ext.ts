import { connectDb } from "@/lib/db";
import { getHouseDisplayName } from "@/lib/house-name";
import type { UpdateBudgetThresholdsInput } from "@/lib/validation";
import { HouseSettings } from "@/models/HouseSettings";

export type HouseSettingsDTO = {
  displayName: string;
  budgetThresholdWarn: number;
  budgetThresholdOver: number;
  overspendAcknowledgedMonthKey?: string;
};

const DEFAULT_WARN = 0.8;
const DEFAULT_OVER = 1;

async function ensureHouseSettingsDoc() {
  await connectDb();
  const existing = await HouseSettings.findOne({ key: "default" }).lean();
  if (existing) return existing;
  const displayName = await getHouseDisplayName();
  const created = await HouseSettings.create({
    key: "default",
    displayName,
    budgetThresholdWarn: DEFAULT_WARN,
    budgetThresholdOver: DEFAULT_OVER,
  });
  return created.toObject();
}

export async function getHouseSettings(): Promise<HouseSettingsDTO> {
  const doc = await ensureHouseSettingsDoc();
  const displayName = doc.displayName?.trim() || (await getHouseDisplayName());
  return {
    displayName,
    budgetThresholdWarn: doc.budgetThresholdWarn ?? DEFAULT_WARN,
    budgetThresholdOver: doc.budgetThresholdOver ?? DEFAULT_OVER,
    overspendAcknowledgedMonthKey: doc.overspendAcknowledgedMonthKey,
  };
}

export async function updateBudgetThresholds(
  input: UpdateBudgetThresholdsInput,
): Promise<HouseSettingsDTO> {
  await connectDb();
  const updates: Record<string, number> = {};
  if (input.budgetThresholdWarn != null) updates.budgetThresholdWarn = input.budgetThresholdWarn;
  if (input.budgetThresholdOver != null) updates.budgetThresholdOver = input.budgetThresholdOver;
  await HouseSettings.findOneAndUpdate(
    { key: "default" },
    { $set: updates },
    { upsert: true },
  );
  return getHouseSettings();
}

export async function acknowledgeOverspend(monthKey: string): Promise<HouseSettingsDTO> {
  await connectDb();
  await HouseSettings.findOneAndUpdate(
    { key: "default" },
    { $set: { overspendAcknowledgedMonthKey: monthKey } },
    { upsert: true },
  );
  return getHouseSettings();
}

export function isOverspendAcknowledged(
  settings: HouseSettingsDTO,
  monthKey: string,
): boolean {
  return settings.overspendAcknowledgedMonthKey === monthKey;
}
