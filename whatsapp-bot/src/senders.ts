import wweb from "whatsapp-web.js";

type Chat = wweb.Chat;

const DIVIDER = "━━━━━━━━━━━━━━━";

export type ExpenseAlertPayload = {
  appName: string;
  title: string;
  payerName: string;
  amount: string | number;
  categoryEmoji: string;
  categoryLabel: string;
  dateLine: string;
  isSplit: boolean;
  splitCount: number;
  /** Per-person share when split among multiple members */
  splitShareAmount?: number | null;
  walletRemaining: number | null;
  budget: number | null;
  budgetUsagePercent: number | null;
  detailUrl?: string;
  hasBill?: boolean;
  variant?: "created" | "updated" | "settlement";
  settlementToName?: string;
};

export type WalletPayload = {
  name: string;
  amount: string | number;
};

export type BillImagePayload = {
  imageUrl: string;
  caption: string;
};

export type MonthResetPayload = {
  appName: string;
  monthKey: string;
  monthLabel: string;
  budget: string | number;
  detailUrl?: string;
  carryForwardBalances?: boolean;
};

function formatAmount(amount: string | number): string {
  return typeof amount === "number" ? amount.toLocaleString("en-IN") : amount;
}

function boldRupee(amount: string | number): string {
  return `*₹${formatAmount(amount)}*`;
}

/** Premium fintech-style expense / settlement line message (WhatsApp *bold*). */
export function formatExpenseMessage(data: ExpenseAlertPayload): string {
  const amt = boldRupee(data.amount);
  const variant = data.variant ?? "created";

  if (variant === "settlement") {
    const to = data.settlementToName ?? "?";
    const lines = [
      `💸 *${data.appName} — Settlement*`,
      "",
      `*${data.payerName}* paid ${amt} to *${to}*`,
      "",
      `📅 ${data.dateLine}`,
      "",
      DIVIDER,
    ];
    if (data.detailUrl) {
      lines.push("", "🔗 *Open dashboard*", data.detailUrl);
    }
    return lines.join("\n");
  }

  const headerEmoji = data.categoryEmoji || "💸";
  const headerSuffix = variant === "updated" ? "Expense Updated" : "Expense Update";
  const header = `${headerEmoji} *${data.appName} — ${headerSuffix}*`;

  const titleLine = `💸 *${data.title}*`;
  const paidLine = `*${data.payerName}* paid ${amt}`;

  const metaLine = `${data.categoryEmoji} ${data.categoryLabel} • ${data.dateLine}`;

  let splitBlock: string;
  if (!data.isSplit) {
    splitBlock = `💼 *House expense*\n👥 Split: *Not applicable*`;
  } else if (data.splitCount > 1 && data.splitShareAmount != null) {
    splitBlock = `👥 *Split ·* ${boldRupee(data.splitShareAmount)} each · ${data.splitCount} people`;
  } else {
    splitBlock = `👥 *Split ·* ${data.splitCount} member${data.splitCount === 1 ? "" : "s"}`;
  }

  const walletLines: string[] = ["💰 *Wallet Balance*"];
  if (data.walletRemaining != null) {
    walletLines.push(`${boldRupee(data.walletRemaining)} remaining`);
  } else if (data.budget != null) {
    walletLines.push("Track spending in the app");
  } else {
    walletLines.push("Set a monthly budget in the app");
  }

  const parts: string[] = [
    header,
    "",
    titleLine,
    paidLine,
    "",
    metaLine,
    "",
    splitBlock,
    "",
    DIVIDER,
    "",
    ...walletLines,
  ];

  if (data.budgetUsagePercent != null) {
    const pct = data.budgetUsagePercent;
    const over = pct > 100;
    parts.push(
      over
        ? `⚠️ Budget usage: *${pct}%* — *over budget*`
        : `⚠️ Budget usage: *${pct}%* consumed`,
    );
  }

  if (data.hasBill) {
    parts.push("", "🧾 Receipt attached below");
  }

  if (data.detailUrl) {
    parts.push("", "🔗 *Open dashboard*", data.detailUrl);
  }

  return parts.join("\n");
}

export function formatWalletMessage(data: WalletPayload): string {
  const amt = boldRupee(data.amount);
  return `🎉 *${data.name}* added ${amt} to wallet`;
}

export function formatMonthResetMessage(data: MonthResetPayload): string {
  const b = boldRupee(data.budget);
  const carry = data.carryForwardBalances;
  const carryLine =
    carry === undefined
      ? null
      : carry
        ? "🔁 Balances carry forward as usual."
        : "📌 Fresh month — check ledger preferences in the app.";

  const lines = [
    `📅 *${data.appName} — New month*`,
    "",
    `*${data.monthLabel}*`,
    `💰 Monthly wallet: ${b}`,
    "",
    DIVIDER,
  ];
  if (carryLine) lines.push("", carryLine);
  if (data.detailUrl) {
    lines.push("", "🔗 *Open dashboard*", data.detailUrl);
  }
  return lines.join("\n");
}

export async function sendExpenseMessage(chat: Chat, data: ExpenseAlertPayload): Promise<void> {
  await chat.sendMessage(formatExpenseMessage(data));
}

export async function sendWalletMessage(chat: Chat, data: WalletPayload): Promise<void> {
  await chat.sendMessage(formatWalletMessage(data));
}

export async function sendMonthResetMessage(chat: Chat, data: MonthResetPayload): Promise<void> {
  await chat.sendMessage(formatMonthResetMessage(data));
}

export async function sendBillImage(chat: Chat, data: BillImagePayload): Promise<void> {
  const media = await wweb.MessageMedia.fromUrl(data.imageUrl, { unsafeMime: true });
  await chat.sendMessage(media, { caption: data.caption });
}
