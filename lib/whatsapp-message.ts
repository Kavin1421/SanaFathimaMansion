export type WhatsAppExpenseVariant =
  | "created"
  | "updated"
  | "pending"
  | "approved"
  | "rejected"
  | "deleted"
  | "settlement";

export type WhatsAppExpenseMessage = {
  houseName: string;
  variant: WhatsAppExpenseVariant;
  title: string;
  amount: number;
  payerName: string;
  category: string;
  dateLine: string;
  description?: string;
  notes?: string;
  splitMembers?: { name: string; amount: number }[];
  wholeHouse?: boolean;
  walletRemaining?: number | null;
  totalSpent?: number | null;
  budget?: number | null;
  detailUrl?: string;
  receiptCount?: number;
  approvedByName?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  removedByName?: string;
  undone?: boolean;
  settlementToName?: string;
};

export type WhatsAppNotice = {
  houseName: string;
  heading: string;
  title: string;
  lines?: string[];
  detailUrl?: string;
};

const HEADING: Record<WhatsAppExpenseVariant, string> = {
  created: "New expense",
  updated: "Expense updated",
  pending: "Waiting for approval",
  approved: "Expense approved",
  rejected: "Expense declined",
  deleted: "Expense removed",
  settlement: "Settlement recorded",
};

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function clean(value?: string): string {
  return value?.trim() ?? "";
}

/** WhatsApp-native expense alert. Uses *bold* and short sections, not Telegram HTML. */
export function formatWhatsAppNotice(data: WhatsAppNotice): string {
  const lines = [data.houseName, data.heading, "", `*${data.title}*`];
  const details = (data.lines ?? []).map((line) => line.trim()).filter(Boolean);
  if (details.length > 0) {
    lines.push("");
    lines.push(...details);
  }
  const url = data.detailUrl?.trim();
  if (url) lines.push("", url);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatWhatsAppExpense(data: WhatsAppExpenseMessage): string {
  const heading = data.variant === "deleted" && data.undone ? "Expense undone" : HEADING[data.variant];
  const lines: string[] = [data.houseName, heading, ""];

  if (data.variant === "settlement") {
    lines.push(`*${data.payerName}* paid *${data.settlementToName ?? "someone"}*`);
    lines.push(`*${inr(data.amount)}*`);
    lines.push("", data.dateLine);
  } else {
    lines.push(`*${data.title}*`);
    lines.push(`*${inr(data.amount)}*`);
    lines.push("", `${data.payerName} paid  ·  ${data.category}`, data.dateLine);
  }

  if (data.variant === "approved" && clean(data.approvedByName)) {
    lines.push("", `Approved by ${clean(data.approvedByName)}`);
  }
  if (data.variant === "rejected") {
    const who = clean(data.rejectedByName);
    lines.push("", who ? `Declined by ${who}` : "Declined");
    if (clean(data.rejectionReason)) lines.push(clean(data.rejectionReason));
  }
  if (data.variant === "pending") {
    lines.push("", "The wallet updates after this is approved.");
  }
  if (data.variant === "deleted") {
    const who = clean(data.removedByName);
    const verb = data.undone ? "Undone" : "Removed";
    lines.push("", who ? `${verb} by ${who}` : `${verb} from the ledger`);
  }

  const description = clean(data.description);
  const notes = clean(data.notes);
  if (description || notes) {
    lines.push("");
    if (description) lines.push(description);
    if (notes) lines.push(notes);
  }

  if (data.variant !== "settlement") {
    if (data.wholeHouse || !data.splitMembers?.length) {
      lines.push("", "Whole household  ·  not split between members");
    } else {
      lines.push("", `Split between ${data.splitMembers.length}`);
      for (const member of data.splitMembers) {
        lines.push(`${member.name}  ·  ${inr(member.amount)}`);
      }
    }
  }

  const hasWallet = data.walletRemaining != null || (data.totalSpent != null && data.budget != null);
  if (hasWallet && data.variant !== "pending" && data.variant !== "rejected") {
    lines.push("", "Wallet");
    if (data.walletRemaining != null) lines.push(`${inr(data.walletRemaining)} remaining`);
    if (data.totalSpent != null && data.budget != null) {
      lines.push(`${inr(data.totalSpent)} of ${inr(data.budget)} spent`);
    }
  }

  if (data.receiptCount && data.receiptCount > 0) {
    lines.push("", data.receiptCount > 1 ? `${data.receiptCount} receipts` : "Receipt");
  }

  if (clean(data.detailUrl)) {
    lines.push("", clean(data.detailUrl));
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
