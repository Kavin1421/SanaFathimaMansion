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
  SETTLEMENT_CONFIRMED: "Settlement confirmed",
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
  UPDATE_ACCOUNT_PROFILE: "Profile updated",
  UPDATE_REMINDER_PREFS: "Reminder preferences updated",
  DELETE_USER: "User deleted",
  CREATE_PRE_BILL: "Pre-bill created",
  FINALIZE_PRE_BILL: "Pre-bill finalized",
  DUPLICATE_PRE_BILL: "Pre-bill duplicated",
  LINK_PRE_BILL_EXPENSE: "Pre-bill linked to expense",
  DELETE_PRE_BILL: "Pre-bill deleted",
  UPDATE_FINALIZED_PRE_BILL: "Finalized pre-bill updated",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  session: "Session",
  user: "User",
  account: "Account",
  house_month: "Month",
  house: "House",
  onboarding: "Onboarding",
  settlement: "Settlement",
  budget: "Budget",
  preBill: "Pre-bill",
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
    case "SETTLEMENT_CONFIRMED":
      return targetEntity.label?.trim() || "Settlement confirmed";
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
    case "UPDATE_REMINDER_PREFS":
    case "CREATE_USER":
    case "DELETE_USER":
      return targetEntity.label?.trim() || (previousValue?.email as string) || (newValue?.email as string) || fallback;
    case "CREATE_PRE_BILL":
    case "FINALIZE_PRE_BILL":
    case "DUPLICATE_PRE_BILL":
    case "UPDATE_FINALIZED_PRE_BILL":
    case "LINK_PRE_BILL_EXPENSE":
    case "DELETE_PRE_BILL":
      return targetEntity.label?.trim() || fallback;
    default:
      return fallback;
  }
}
