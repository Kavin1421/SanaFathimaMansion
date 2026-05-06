export const queryKeys = {
  users: ["users"] as const,
  expenses: (filters: Record<string, string | undefined>) => ["expenses", filters] as const,
  dashboard: (month: string) => ["dashboard", month] as const,
  auditLogs: (filters: Record<string, string | number | undefined>) => ["auditLogs", filters] as const,
  notificationEvents: (filters: Record<string, string | number | undefined>) =>
    ["notificationEvents", filters] as const,
};
