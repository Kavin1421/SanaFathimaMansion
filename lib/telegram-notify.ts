import { CATEGORY_META, type ExpenseCategory } from "@/lib/constants";
import { monthKeyFromDate } from "@/lib/dates";
import { connectDb } from "@/lib/db";
import { getHouseDisplayName } from "@/lib/house-name";
import { roundMoney } from "@/lib/ledger";
import { User } from "@/models/User";
import {
  isTelegramConfigured,
  sendTelegramImage,
  sendTelegramMessage,
  sendTelegramPlainMessage,
} from "@/services/telegram";
import { getMonthWalletSnapshot } from "@/services/house-month";
import { appendNotificationEvent } from "@/services/notification-events";
import type { ExpenseDTO, PreBillDTO } from "@/types";
import { format, parse } from "date-fns";

const DIVIDER = "━━━━━━━━━━━━━━━";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatAmount(amount: string | number): string {
  return typeof amount === "number" ? amount.toLocaleString("en-IN") : amount;
}

function boldRupee(amount: string | number): string {
  return `<b>₹${escapeHtml(formatAmount(amount))}</b>`;
}

function appDetailUrl(monthKey: string): string | null {
  const raw = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = raw?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/expenses?month=${encodeURIComponent(monthKey)}`;
}

export function preBillDetailUrl(preBillId: string): string | null {
  const raw = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = raw?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/pre-bills/${encodeURIComponent(preBillId)}`;
}

function formatPreBillItemLineHtml(item: PreBillDTO["items"][number]): string {
  const qty =
    item.quantity % 1 === 0 ? String(item.quantity) : String(item.quantity);
  const qtyUnit = item.unit === "pcs" ? `${qty} ${item.unit}` : `${qty}${item.unit}`;
  const base = `• ${escapeHtml(item.name)} - ${escapeHtml(qtyUnit)}`;
  if (typeof item.price === "number" && item.price >= 0) {
    return `${base} · <b>₹${escapeHtml(String(item.price.toLocaleString("en-IN")))}</b>`;
  }
  return base;
}

type ExpenseAlertPayload = {
  appName: string;
  title: string;
  payerName: string;
  amount: string | number;
  categoryEmoji: string;
  categoryLabel: string;
  dateLine: string;
  isSplit: boolean;
  splitCount: number;
  splitShareAmount?: number | null;
  splitMembers?: { name: string; amount: string | number }[];
  walletRemaining: number | null;
  budget: number | null;
  budgetUsagePercent: number | null;
  detailUrl?: string;
  hasBill?: boolean;
  variant?: "created" | "updated" | "settlement";
  settlementToName?: string;
};

function formatExpenseAlertHtml(data: ExpenseAlertPayload): string {
  const amt = boldRupee(data.amount);
  const variant = data.variant ?? "created";

  if (variant === "settlement") {
    const to = escapeHtml(data.settlementToName ?? "?");
    const lines = [
      `💸 <b>${escapeHtml(data.appName)}</b>`,
      "✅ <b>Settlement recorded</b>",
      "",
      `🤝 <b>${escapeHtml(data.payerName)}</b> → <b>${to}</b>`,
      `💵 Amount: ${amt}`,
      "",
      `📆 ${escapeHtml(data.dateLine)}`,
      "",
      escapeHtml(DIVIDER),
    ];
    if (data.detailUrl) {
      lines.push("", "🔗 <b>Ledger</b>", escapeHtml(data.detailUrl));
    }
    return lines.join("\n");
  }

  const em = data.categoryEmoji || "💸";
  const headerSuffix = variant === "updated" ? "✏️ Expense updated" : "✨ New expense";
  const header = `${em} <b>${escapeHtml(data.appName)}</b>`;
  const sub = `<i>${escapeHtml(headerSuffix)}</i>`;

  const titleLine = `📝 <b>${escapeHtml(data.title)}</b>`;
  const paidLine = `👤 <b>${escapeHtml(data.payerName)}</b> paid ${amt}`;

  const metaLine = `📆 ${em} <b>${escapeHtml(data.categoryLabel)}</b> · ${escapeHtml(data.dateLine)}`;

  let splitBlock: string;
  if (!data.isSplit) {
    splitBlock = `🏠 <b>House expense</b>\n👥 Split · <b>not applicable</b>`;
  } else if (data.splitCount > 1 && data.splitShareAmount != null) {
    const memberLines =
      data.splitMembers && data.splitMembers.length > 0
        ? data.splitMembers
            .map((m) => `• ${escapeHtml(m.name)}: ${boldRupee(m.amount)}`)
            .join("\n")
        : null;
    splitBlock = memberLines
      ? `👥 <b>Shared split details</b>\n${memberLines}`
      : `👥 <b>Shared ·</b> ${boldRupee(data.splitShareAmount)} each · ${data.splitCount} people`;
  } else {
    splitBlock = `👥 <b>Split ·</b> ${data.splitCount} member${data.splitCount === 1 ? "" : "s"}`;
  }

  const walletLines: string[] = ["💰 <b>Wallet balance</b>"];
  if (data.walletRemaining != null) {
    walletLines.push(`${boldRupee(data.walletRemaining)} remaining`);
  } else if (data.budget != null) {
    walletLines.push("📋 Track spending in the app");
  } else {
    walletLines.push("📋 Set a monthly budget in the app");
  }

  const parts: string[] = [
    header,
    sub,
    "",
    titleLine,
    paidLine,
    "",
    metaLine,
    "",
    splitBlock,
    "",
    escapeHtml(DIVIDER),
    "",
    ...walletLines,
  ];

  if (data.budgetUsagePercent != null) {
    const pct = data.budgetUsagePercent;
    const over = pct > 100;
    parts.push(
      over
        ? `⚠️ <b>Budget ·</b> ${pct}% used — <b>over cap</b>`
        : `📊 <b>Budget ·</b> ${pct}% used`,
    );
  }

  if (data.hasBill) {
    parts.push("", "🧾 <b>Receipt</b> attached below");
  }

  if (data.detailUrl) {
    parts.push("", "🔗 <b>Open in app</b>", escapeHtml(data.detailUrl));
  }

  return parts.join("\n");
}

function formatMonthResetHtml(data: {
  appName: string;
  monthLabel: string;
  budget: number;
  detailUrl?: string;
  carryForwardBalances?: boolean;
}): string {
  const b = boldRupee(data.budget);
  const carry = data.carryForwardBalances;
  const carryLine =
    carry === undefined
      ? null
      : carry
        ? "🔁 Balances carry forward as usual."
        : "📌 Fresh month — check preferences in the app.";

  const lines = [
    `📅 <b>${escapeHtml(data.appName)}</b>`,
    "🌙 <b>New month started</b>",
    "",
    `✨ <b>${escapeHtml(data.monthLabel)}</b>`,
    `💰 Monthly wallet: ${b}`,
    "",
    escapeHtml(DIVIDER),
  ];
  if (carryLine) lines.push("", escapeHtml(carryLine));
  if (data.detailUrl) {
    lines.push("", "🔗 <b>Open in app</b>", escapeHtml(data.detailUrl));
  }
  return lines.join("\n");
}

function formatWalletBudgetHtml(data: {
  appName: string;
  monthLabel: string;
  budget: number;
  detailUrl?: string;
}): string {
  const b = boldRupee(data.budget);
  const lines = [
    `📅 <b>${escapeHtml(data.appName)}</b>`,
    "💰 <b>Monthly wallet updated</b>",
    "",
    `📆 <b>${escapeHtml(data.monthLabel)}</b>`,
    `Budget: ${b}`,
    "",
    escapeHtml(DIVIDER),
  ];
  if (data.detailUrl) {
    lines.push("", "🔗 <b>Open in app</b>", escapeHtml(data.detailUrl));
  }
  return lines.join("\n");
}

function formatWalletBudgetAmendedHtml(data: {
  appName: string;
  monthLabel: string;
  previousBudget: number;
  additionalAmount: number;
  budget: number;
  detailUrl?: string;
}): string {
  const lines = [
    `📅 <b>${escapeHtml(data.appName)}</b>`,
    "💰 <b>Monthly wallet amended</b>",
    "",
    `📆 <b>${escapeHtml(data.monthLabel)}</b>`,
    `Existing: ${boldRupee(data.previousBudget)}`,
    `Added: ${boldRupee(data.additionalAmount)}`,
    `New total: ${boldRupee(data.budget)}`,
    "",
    escapeHtml(DIVIDER),
  ];
  if (data.detailUrl) {
    lines.push("", "🔗 <b>Open in app</b>", escapeHtml(data.detailUrl));
  }
  return lines.join("\n");
}

async function recordEvent(input: {
  eventType: string;
  status: "sent" | "failed" | "skipped";
  recipient?: string;
  message?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await appendNotificationEvent({
    channel: "telegram",
    eventType: input.eventType,
    status: input.status,
    recipient: input.recipient,
    message: input.message,
    metadata: input.metadata ?? null,
  });
}

async function sendPipeline(input: {
  html?: string;
  plain?: string;
  imageUrl?: string;
  captionHtml?: string;
  eventType: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    if (!isTelegramConfigured()) {
      await recordEvent({
        eventType: input.eventType,
        status: "skipped",
        message: "Telegram TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing",
        metadata: input.metadata ?? null,
      });
      return;
    }

    let ok = false;
    if (input.imageUrl?.trim() && input.captionHtml) {
      ok = await sendTelegramImage(input.imageUrl.trim(), input.captionHtml);
    } else if (input.html) {
      ok = await sendTelegramMessage(input.html);
    } else if (input.plain) {
      ok = await sendTelegramPlainMessage(input.plain);
    }

    await recordEvent({
      eventType: input.eventType,
      status: ok ? "sent" : "failed",
      message: ok ? undefined : "Telegram API request failed",
      metadata: input.metadata ?? null,
    });
  } catch (e) {
    console.error("[telegram-notify] sendPipeline", e);
  }
}

export function notifyTelegramPreBillFinalized(
  dto: PreBillDTO,
  creatorName: string,
  finalizedDate: Date,
): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const dateLine = format(finalizedDate, "d MMM yyyy · h:mm a");
      const detailUrl = preBillDetailUrl(dto._id);
      const itemLines = dto.items.map((i) => formatPreBillItemLineHtml(i)).join("\n");
      const html = [
        `🏠 <b>${escapeHtml(appName)}</b>`,
        "",
        "🧾 <b>Smart Pre-Bill Finalized</b>",
        "",
        `🛒 <b>${escapeHtml(dto.title)}</b>`,
        "",
        itemLines,
        "",
        escapeHtml(DIVIDER),
        "",
        `👤 ${escapeHtml(creatorName)}`,
        `📅 ${escapeHtml(dateLine)}`,
      ];
      if (detailUrl) {
        html.push("", "🔗 <b>Open in app</b>", escapeHtml(detailUrl));
      }
      await sendPipeline({
        html: html.join("\n"),
        eventType: "telegram_pre_bill_finalized",
        metadata: { preBillId: dto._id },
      });
    } catch (e) {
      console.error("[telegram-notify] pre-bill finalized", e);
    }
  })();
}

/** After editing a finalized pre-bill or explicitly pushing an update to Telegram. */
export function notifyTelegramPreBillEdited(
  dto: PreBillDTO,
  editorName: string,
  editedDate: Date,
): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const dateLine = format(editedDate, "d MMM yyyy · h:mm a");
      const detailUrl = preBillDetailUrl(dto._id);
      const itemLines = dto.items.map((i) => formatPreBillItemLineHtml(i)).join("\n");
      const html: string[] = [
        `🏠 <b>${escapeHtml(appName)}</b>`,
        "",
        "✏️ <b>Smart Pre-Bill Updated</b>",
        "<i>Latest version of this finalized pre-bill.</i>",
        "",
        `🛒 <b>${escapeHtml(dto.title)}</b>`,
        "",
        itemLines,
        "",
        escapeHtml(DIVIDER),
      ];
      if (dto.notes?.trim()) {
        html.push("", `📝 <b>Notes</b>`, escapeHtml(dto.notes.trim()));
      }
      html.push("", `👤 ${escapeHtml(editorName)}`, `📅 ${escapeHtml(dateLine)}`);
      if (detailUrl) {
        html.push("", "🔗 <b>Open in app</b>", escapeHtml(detailUrl));
      }
      await sendPipeline({
        html: html.join("\n"),
        eventType: "telegram_pre_bill_edited",
        metadata: { preBillId: dto._id },
      });
    } catch (e) {
      console.error("[telegram-notify] pre-bill edited", e);
    }
  })();
}

/** When every line on a pre-bill is marked purchased. */
export function notifyTelegramPreBillShoppingCompleted(title: string): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const t = title.trim() || "Shopping list";
      const html = [
        `🏠 <b>${escapeHtml(appName)}</b>`,
        "",
        `🛒 <b>Shopping completed for ${escapeHtml(t)}</b>`,
      ].join("\n");
      await sendPipeline({
        html,
        eventType: "telegram_pre_bill_shopping_complete",
        metadata: { title: t },
      });
    } catch (e) {
      console.error("[telegram-notify] pre-bill shopping completed", e);
    }
  })();
}

/** Fire-and-forget plain text (balance reminders, summaries). */
export function notifyTelegramText(text: string): void {
  if (!text.trim()) return;
  void sendPipeline({
    plain: text.trim(),
    eventType: "telegram_text",
  });
}

export function notifyTelegramExpense(dto: ExpenseDTO, mode: "created" | "updated" = "created"): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const payer = await User.findById(dto.paidBy).lean();
      const payerName = payer?.name ?? "Someone";
      const cat = dto.category as ExpenseCategory;
      const meta = CATEGORY_META[cat];
      const categoryEmoji = meta?.emoji ?? "💸";
      const categoryLabel = dto.category;

      const expenseDate = new Date(dto.date);
      const monthKey = monthKeyFromDate(expenseDate);
      const { remaining, budget, totalSpent } = await getMonthWalletSnapshot(monthKey);
      const dateLine = format(expenseDate, "d MMM yyyy");

      const budgetUsagePercent =
        budget != null && budget > 0 ? Math.round((totalSpent / budget) * 100) : null;

      const isSplit = dto.splitEnabled !== false;
      const n = dto.splitBetween.length;
      const sharePer = isSplit && n > 1 ? roundMoney(dto.amount / n) : null;
      const splitMembers =
        isSplit && n > 1
          ? (
              await User.find({ _id: { $in: dto.splitBetween } })
                .select("name")
                .lean()
            ).map((u) => ({
              name: u.name,
              amount: sharePer ?? 0,
            }))
          : [];

      const detailUrl = appDetailUrl(monthKey);
      const bill = dto.billImage?.trim();

      const alert: ExpenseAlertPayload = {
        appName,
        title: dto.title,
        payerName,
        amount: dto.amount,
        categoryEmoji,
        categoryLabel,
        dateLine,
        isSplit,
        splitCount: n,
        splitShareAmount: sharePer ?? undefined,
        splitMembers: splitMembers.length > 0 ? splitMembers : undefined,
        walletRemaining: remaining,
        budget,
        budgetUsagePercent,
        detailUrl: detailUrl ?? undefined,
        hasBill: Boolean(bill),
        variant: mode === "updated" ? "updated" : "created",
      };

      const caption = formatExpenseAlertHtml({
        ...alert,
        hasBill: Boolean(bill),
      });

      await sendPipeline({
        imageUrl: bill || undefined,
        captionHtml: bill ? caption : undefined,
        html: bill ? undefined : caption,
        eventType: mode === "updated" ? "telegram_expense_updated" : "telegram_expense_created",
        metadata: { expenseId: dto._id, monthKey },
      });
    } catch (e) {
      console.error("[telegram-notify] expense pipeline", e);
    }
  })();
}

export function notifyTelegramSettlementRecorded(
  fromUserId: string,
  toUserId: string,
  amount: number,
): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const [from, to] = await Promise.all([
        User.findById(fromUserId).lean(),
        User.findById(toUserId).lean(),
      ]);
      const monthKey = monthKeyFromDate(new Date());
      const detailUrl = appDetailUrl(monthKey);
      const html = formatExpenseAlertHtml({
        appName,
        title: "Settlement",
        payerName: from?.name ?? "?",
        amount,
        categoryEmoji: "💸",
        categoryLabel: "Settlement",
        dateLine: format(new Date(), "d MMM yyyy"),
        isSplit: false,
        splitCount: 1,
        walletRemaining: null,
        budget: null,
        budgetUsagePercent: null,
        detailUrl: detailUrl ?? undefined,
        variant: "settlement",
        settlementToName: to?.name ?? "?",
      });
      await sendPipeline({
        html,
        eventType: "telegram_settlement",
        metadata: { fromUserId, toUserId },
      });
    } catch (e) {
      console.error("[telegram-notify] settlement", e);
    }
  })();
}

export function notifyTelegramMonthReset(
  monthKey: string,
  budget: number,
  options?: { carryForwardBalances?: boolean },
): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const detailUrl = appDetailUrl(monthKey);
      const monthStart = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
      const monthLabel = format(monthStart, "MMMM yyyy");
      const html = formatMonthResetHtml({
        appName,
        monthLabel,
        budget,
        detailUrl: detailUrl ?? undefined,
        carryForwardBalances: options?.carryForwardBalances,
      });
      await sendPipeline({
        html,
        eventType: "telegram_month_reset",
        metadata: { monthKey, budget },
      });
    } catch (e) {
      console.error("[telegram-notify] month reset", e);
    }
  })();
}

export function notifyTelegramWalletBudgetAmended(
  monthKey: string,
  amounts: { previousBudget: number; additionalAmount: number; budget: number },
): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const detailUrl = appDetailUrl(monthKey);
      const monthStart = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
      const monthLabel = format(monthStart, "MMMM yyyy");
      const html = formatWalletBudgetAmendedHtml({
        appName,
        monthLabel,
        ...amounts,
        detailUrl: detailUrl ?? undefined,
      });
      await sendPipeline({
        html,
        eventType: "telegram_wallet_amended",
        metadata: { monthKey, ...amounts },
      });
    } catch (e) {
      console.error("[telegram-notify] wallet amend", e);
    }
  })();
}

export function notifyTelegramWalletBudgetUpdated(monthKey: string, budget: number): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const detailUrl = appDetailUrl(monthKey);
      const monthStart = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
      const monthLabel = format(monthStart, "MMMM yyyy");
      const html = formatWalletBudgetHtml({
        appName,
        monthLabel,
        budget,
        detailUrl: detailUrl ?? undefined,
      });
      await sendPipeline({
        html,
        eventType: "telegram_wallet_updated",
        metadata: { monthKey, budget },
      });
    } catch (e) {
      console.error("[telegram-notify] wallet budget", e);
    }
  })();
}
