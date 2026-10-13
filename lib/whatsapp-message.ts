export type WhatsAppExpenseVariant =
  | "created"
  | "updated"
  | "pending"
  | "approved"
  | "rejected"
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
  approvedByName?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  settlementToName?: string;
};

const HEADING: Record<WhatsAppExpenseVariant, string> = {
  created: "New expense",
  updated: "Expense updated",
  pending: "Waiting for approval",
  approved: "Expense approved",
  rejected: "Expense declined",
  settlement: "Settlement recorded",
};

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function clean(value?: string): string {
  return value?.trim() ?? "";
}

/** WhatsApp-native expense alert. Uses *bold* and short sections, not Telegram HTML. */
export function formatWhatsAppExpense(data: WhatsAppExpenseMessage): string {
  const lines: string[] = [data.houseName, HEADING[data.variant], ""];

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

  if (clean(data.detailUrl)) {
    lines.push("", clean(data.detailUrl));
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
