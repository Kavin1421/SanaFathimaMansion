export const queryKeys = {
  users: ["users"] as const,
  expenses: (filters: Record<string, string | undefined>) => ["expenses", filters] as const,
  dashboard: (month: string) => ["dashboard", month] as const,
};
