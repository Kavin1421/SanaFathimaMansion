export const EXPENSE_CATEGORIES = [
  "Rent",
  "Groceries",
  "Vegetables",
  "Gas",
  "Misc",
  "Others",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_META: Record<
  ExpenseCategory,
  { emoji: string; label: string }
> = {
  Rent: { emoji: "🏠", label: "Rent" },
  Groceries: { emoji: "🥦", label: "Groceries" },
  Vegetables: { emoji: "🥕", label: "Vegetables" },
  Gas: { emoji: "🔥", label: "Gas" },
  Misc: { emoji: "📦", label: "Misc" },
  Others: { emoji: "✏️", label: "Others" },
};

export const DEFAULT_HOUSE_NAME =
  process.env.NEXT_PUBLIC_HOUSE_NAME ?? "SanaFathima Mansion";
