export type UserMessageContext =
  | "expense"
  | "expense-preview"
  | "settlement"
  | "wallet"
  | "auth"
  | "upload"
  | "network"
  | "generic";

const CONTEXT_FALLBACK: Record<UserMessageContext, string> = {
  expense: "We couldn't save this expense. Check the form and try again.",
  "expense-preview": "We couldn't preview the split. Check the amount and who is included, then try again.",
  settlement: "We couldn't record this settlement. Please try again.",
  wallet: "We couldn't update the monthly wallet. Please try again.",
  auth: "Sign-in failed. Check your details or try again in a moment.",
  upload: "We couldn't upload that file. Try a smaller image (under 5 MB).",
  network: "Connection problem — check your internet and refresh the page.",
  generic: "Something went wrong on our side. Please try again.",
};

type PatternRule = { test: RegExp; message: string };

const PATTERN_RULES: PatternRule[] = [
  {
    test: /invalid expense|need positive amount|at least one splitter/i,
    message: "Check the expense amount and pick at least one person for the split.",
  },
  {
    test: /custom split amounts must add up/i,
    message: "Custom split amounts must equal the expense total.",
  },
  {
    test: /unauthorized|sign in/i,
    message: "Your session expired. Please sign in again.",
  },
  {
    test: /only an admin|super admin/i,
    message: "You don't have permission for this action. Ask a household admin.",
  },
  {
    test: /failed to load|network|fetch/i,
    message: "We couldn't reach the server. Check your connection and try again.",
  },
  {
    test: /validation|required|fill title/i,
    message: "Some required fields are missing. Review the form and try again.",
  },
  {
    test: /not found|404/i,
    message: "That item is no longer available. Refresh the page.",
  },
  {
    test: /undo|grace|5 minute/i,
    message: "This expense can no longer be undone — the safe window has passed.",
  },
  {
    test: /mongodb|mongo|ECONNREFUSED|internal server/i,
    message: "The app is having trouble connecting. Try again in a moment.",
  },
];

function looksTechnical(message: string): boolean {
  return (
    /^\s*at\s+\w+/m.test(message) ||
    /\.tsx:\d+|\.ts:\d+/i.test(message) ||
    /digest:/i.test(message) ||
    /TypeError|ReferenceError|SyntaxError/i.test(message) ||
    message.length > 220
  );
}

function isLikelyUserFacing(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (looksTechnical(t)) return false;
  return true;
}

/** Map any thrown value to a short, household-friendly message. */
export function toUserMessage(
  error: unknown,
  context: UserMessageContext = "generic",
): string {
  const fallback = CONTEXT_FALLBACK[context];
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "error" in error && typeof (error as { error: unknown }).error === "string"
          ? (error as { error: string }).error
          : "";

  const trimmed = raw.trim();
  if (trimmed) {
    for (const rule of PATTERN_RULES) {
      if (rule.test.test(trimmed)) return rule.message;
    }
    if (isLikelyUserFacing(trimmed)) return trimmed;
  }

  return fallback;
}

/** ActionResult error helper */
export function actionErrorMessage(
  result: { ok: false; error: string } | { ok: true },
  context?: UserMessageContext,
): string | null {
  if (result.ok) return null;
  return toUserMessage(result.error, context);
}
