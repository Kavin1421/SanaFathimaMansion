import type { AuditActionType } from "@/lib/audit-constants";
import type { AuditLogRow } from "@/services/audit-log";
import { formatInr } from "@/lib/utils";

const ACTION_LABELS: Record<AuditActionType, string> = {
  CREATE_EXPENSE: "Expense created",
  UPDATE_EXPENSE: "Expense updated",
  DELETE_EXPENSE: "Expense deleted",
  CREATE_USER: "User invited",
  RESEND_INVITE: "Invite resent",
  CREATE_SETTLEMENT: "Settlement recorded",
  NUDGE_SENT: "Nudge sent",
  ADD_EXPENSE_COMMENT: "Expense comment added",
  TOGGLE_EXPENSE_REACTION: "Expense reaction toggled",
  ACCESS_DENIED: "Access denied",
  VALIDATION_FAILED: "Validation failed",
  ACTION_FAILED: "Action failed",
  RESET_MONTH: "Month reset",
  LOGIN: "Signed in",
  COMPLETE_ONBOARDING: "Onboarding completed",
  UPDATE_HOUSE: "House updated",
  UPDATE_BUDGET: "Budget updated",
  UPDATE_USER: "User updated",
  DELETE_USER: "User deleted",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  session: "Session",
  user: "User",
  house_month: "Month",
  house: "House",
  onboarding: "Onboarding",
  settlement: "Settlement",
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
    case "CREATE_SETTLEMENT":
      return targetEntity.label?.trim() || "Settlement completed";
    case "NUDGE_SENT":
      return targetEntity.label?.trim() || "Settlement reminder sent";
    case "ADD_EXPENSE_COMMENT":
      return targetEntity.label?.trim() || "Comment added";
    case "TOGGLE_EXPENSE_REACTION":
      return targetEntity.label?.trim() || "Reaction changed";
    case "RESEND_INVITE":
      return targetEntity.label?.trim() || (newValue?.email as string) || "Invite resent";
    case "ACCESS_DENIED":
      return "Blocked by permissions";
    case "VALIDATION_FAILED":
      return "Input validation failed";
    case "ACTION_FAILED":
      return "Operation failed";
    case "COMPLETE_ONBOARDING":
      return "Setup finished";
    case "UPDATE_HOUSE":
      return newValue?.displayName != null && typeof newValue.displayName === "string"
        ? `House name set to ${newValue.displayName}`
        : "House settings updated";
    case "RESET_MONTH":
      return newValue?.monthKey != null && typeof newValue.monthKey === "string"
        ? `Reset ${newValue.monthKey}`
        : "House month reset";
    case "UPDATE_BUDGET":
      return newValue?.budget != null && typeof newValue.budget === "number"
        ? `Budget set to ${formatInr(newValue.budget)}`
        : "Budget changed";
    case "UPDATE_USER":
    case "CREATE_USER":
    case "DELETE_USER":
      return targetEntity.label?.trim() || (previousValue?.email as string) || (newValue?.email as string) || fallback;
    default:
      return fallback;
  }
}
