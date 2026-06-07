export const queryKeys = {
  preBills: (filters?: Record<string, string | undefined>) =>
    ["preBills", filters ?? {}] as const,
  users: ["users"] as const,
  expenses: (filters: Record<string, string | undefined>) => ["expenses", filters] as const,
  dashboard: (month: string) => ["dashboard", month] as const,
  settlements: ["settlements"] as const,
  auditLogs: (filters: Record<string, string | number | undefined>) => ["auditLogs", filters] as const,
  notificationEvents: (filters: Record<string, string | number | undefined>) =>
    ["notificationEvents", filters] as const,
  activity: (limit?: number) => ["activity", limit ?? 20] as const,
  walletHistory: (monthKey?: string) => ["walletHistory", monthKey ?? "all"] as const,
  savingsGoals: ["savingsGoals"] as const,
  recurringExpenses: ["recurringExpenses"] as const,
  pendingExpenses: ["pendingExpenses"] as const,
  monthlyStory: (month: string) => ["monthlyStory", month] as const,
};
