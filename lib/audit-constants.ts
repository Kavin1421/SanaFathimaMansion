export const AUDIT_ACTION_TYPES = [
  "CREATE_EXPENSE",
  "UPDATE_EXPENSE",
  "DELETE_EXPENSE",
  "RESET_MONTH",
  "LOGIN",
  "UPDATE_BUDGET",
  "UPDATE_USER",
  "DELETE_USER",
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];
