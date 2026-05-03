import type { AuditActionType } from "@/lib/audit-constants";
import type { AuditLogRow } from "@/services/audit-log";
import { formatInr } from "@/lib/utils";

const ACTION_LABELS: Record<AuditActionType, string> = {
  CREATE_EXPENSE: "Expense created",
  UPDATE_EXPENSE: "Expense updated",
  DELETE_EXPENSE: "Expense deleted",
  RESET_MONTH: "Month reset",
  LOGIN: "Signed in",
  UPDATE_BUDGET: "Budget updated",
  UPDATE_USER: "User updated",
  DELETE_USER: "User deleted",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  session: "Session",
  user: "User",
  house_month: "Month",
  budget: "Budget",
};

export function friendlyActionLabel(action: AuditActionType): string {
  return ACTION_LABELS[action] ?? action;
}

export function friendlyTargetType(type: string): string {
  return TARGET_TYPE_LABELS[type] ?? type;
}

function expenseSnapshot(obj: Record<string, unknown> | null): { title: string; amount: number } | null {
  if (!obj) return null;
  const title = obj.title;
  const amount = obj.amount;
  if (typeof title === "string" && typeof amount === "number") {
    return { title, amount };
  }
  return null;
}

/** One-line summary for list rows. */
export function auditLogSummaryLine(row: AuditLogRow): string {
  const { actionType, targetEntity, newValue, previousValue } = row;
  const fallback = targetEntity.label?.trim() || targetEntity.id || friendlyTargetType(targetEntity.type);

  switch (actionType) {
    case "CREATE_EXPENSE": {
      const e = expenseSnapshot(newValue);
      return e ? `${e.title} · ${formatInr(e.amount)}` : fallback;
    }
    case "UPDATE_EXPENSE": {
      const e = expenseSnapshot(newValue) ?? expenseSnapshot(previousValue);
      return e ? `${e.title} · ${formatInr(e.amount)}` : fallback;
    }
    case "DELETE_EXPENSE": {
      const e = expenseSnapshot(previousValue);
      return e ? `Removed: ${e.title} · ${formatInr(e.amount)}` : fallback;
    }
    case "LOGIN":
      return "Session started";
    case "RESET_MONTH":
      return newValue?.monthKey != null && typeof newValue.monthKey === "string"
        ? `Reset ${newValue.monthKey}`
        : "House month reset";
    case "UPDATE_BUDGET":
      return newValue?.budget != null && typeof newValue.budget === "number"
        ? `Budget set to ${formatInr(newValue.budget)}`
        : "Budget changed";
    case "UPDATE_USER":
    case "DELETE_USER":
      return targetEntity.label?.trim() || (previousValue?.email as string) || (newValue?.email as string) || fallback;
    default:
      return fallback;
  }
}
