import { CATEGORY_META, type ExpenseCategory } from "@/lib/constants";
import { normalizeBillImages, primaryBillImage } from "@/lib/expense-bills";
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
  TELEGRAM_CAPTION_MAX,
} from "@/services/telegram";
import { getMonthWalletSnapshot } from "@/services/house-month";
import {
  appendNotificationEvent,
  hasRecentNotificationDuplicate,
} from "@/services/notification-events";
import type { ExpenseDTO, PreBillDTO } from "@/types";
import { format, parse } from "date-fns";

const DIVIDER = "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌";
const BANNER_BAR = "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰";
const DEFAULT_APP_WEBSITE = "https://sana.sukeshiitj.me/";
const SUPPORT_EMAIL = "hello@teamgodevs.in";
const DOT = " · ";

function appWebsiteUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    DEFAULT_APP_WEBSITE;
  return `${raw.replace(/\/$/, "")}/`;
}

function telegramFooterHtml(): string {
  const url = appWebsiteUrl();
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return [
    "",
    escapeHtml(DIVIDER),
    `🌐 <a href="${escapeHtml(url)}"><b>${escapeHtml(host)}</b></a>`,
    `💬 <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>`,
  ].join("\n");
}

function telegramFooterPlain(): string {
  return ["", DIVIDER, `🌐 ${appWebsiteUrl()}`, `💬 ${SUPPORT_EMAIL}`].join("\n");
}

function msgBlockquote(lines: string[]): string {
  return `<blockquote>${lines.join("\n")}</blockquote>`;
}

function msgBanner(appName: string, subtitle: string, icon: string): string {
  return [
    escapeHtml(BANNER_BAR),
    `${icon} <b>${escapeHtml(appName)}</b>`,
    `<i>${escapeHtml(subtitle)}</i>`,
    escapeHtml(BANNER_BAR),
  ].join("\n");
}

function msgOpenLink(detailUrl: string, label = "🔗 Open in app"): string {
  return `<a href="${escapeHtml(detailUrl)}"><b>${escapeHtml(label.replace(/^🔗\s*/, ""))}</b></a>`;
}

function expenseVariantMeta(variant: NonNullable<ExpenseAlertPayload["variant"]>): {
  icon: string;
  subtitle: string;
  badge: string | null;
} {
  switch (variant) {
    case "pending":
      return { icon: "⏳", subtitle: "Expense submitted", badge: "⏳ AWAITING APPROVAL" };
    case "approved":
      return { icon: "✅", subtitle: "Expense approved", badge: "✅ APPROVED" };
    case "rejected":
      return { icon: "❌", subtitle: "Expense rejected", badge: "❌ REJECTED" };
    case "updated":
      return { icon: "✏️", subtitle: "Expense updated", badge: null };
    case "settlement":
      return { icon: "🤝", subtitle: "Settlement recorded", badge: null };
    default:
      return { icon: "✨", subtitle: "New expense", badge: null };
  }
}

function budgetProgressBar(pct: number): string {
  const capped = Math.min(100, Math.max(0, pct));
  const filled = Math.round(capped / 10);
  const empty = Math.max(0, 10 - filled);
  const bar = `${"▓".repeat(filled)}${"░".repeat(empty)}`;
  const over = pct > 100 ? ` <b>⚠️ ${pct}%</b>` : ` <b>${pct}%</b>`;
  return `${bar}${over}`;
}

function formatSplitLine(data: ExpenseAlertPayload): string {
  if (!data.isSplit) return "<i>🏠 Whole household · no member split</i>";
  if (data.splitCount > 1 && data.splitShareAmount != null) {
    if (data.splitMembers && data.splitMembers.length > 0) {
      const members = data.splitMembers
        .map((m) => `   • ${escapeHtml(m.name)} ${boldRupee(m.amount)}`)
        .join("\n");
      return `<i>👥 Split among ${data.splitCount}</i>\n${members}`;
    }
    return `<i>👥 Equal split · ${boldRupee(data.splitShareAmount)} each · ${data.splitCount} people</i>`;
  }
  return `<i>👥 Split · ${data.splitCount} member${data.splitCount === 1 ? "" : "s"}</i>`;
}

function formatStatusLine(data: ExpenseAlertPayload, variant: NonNullable<ExpenseAlertPayload["variant"]>): string | null {
  const meta = expenseVariantMeta(variant);
  if (variant === "pending") {
    return `<b>${escapeHtml(meta.badge ?? "")}</b>\n<i>Wallet updates after admin approval</i>`;
  }
  if (variant === "approved") {
    const by = data.approvedByName ? ` · ${escapeHtml(data.approvedByName)}` : "";
    return `<b>${escapeHtml(meta.badge ?? "")}</b>${by ? `\n<i>Approved by${by}</i>` : ""}`;
  }
  if (variant === "rejected") {
    const by = data.rejectedByName ? ` · ${escapeHtml(data.rejectedByName)}` : "";
    const reason = data.rejectionReason ? `\n<i>${escapeHtml(data.rejectionReason)}</i>` : "";
    return `<b>${escapeHtml(meta.badge ?? "")}</b>${by ? `\n<i>Rejected by${by}</i>` : ""}${reason}`;
  }
  return null;
}

function formatExpenseCard(data: ExpenseAlertPayload, amt: string): string {
  const em = data.categoryEmoji || "💸";
  return msgBlockquote([
    `<b>${em} ${escapeHtml(data.title)}</b>`,
    `💰 ${amt}`,
    `👤 ${escapeHtml(data.payerName)}${escapeHtml(DOT)}🏷 ${escapeHtml(data.categoryLabel)}`,
    `📅 ${escapeHtml(data.dateLine)}`,
    formatSplitLine(data),
  ]);
}

function formatWalletCard(data: ExpenseAlertPayload): string | null {
  const lines: string[] = ["<b>💳 MONTHLY WALLET</b>"];
  if (data.walletRemaining != null) {
    lines.push(`${boldRupee(data.walletRemaining)} <i>remaining</i>`);
  }
  if (data.budgetUsagePercent != null) {
    lines.push(budgetProgressBar(data.budgetUsagePercent));
  }
  if (data.totalSpent != null && data.budget != null) {
    lines.push(`📊 ${boldRupee(data.totalSpent)} <i>of</i> ${boldRupee(data.budget)} <i>spent</i>`);
  } else if (data.budget == null && data.walletRemaining == null) {
    lines.push("<i>Set a monthly budget in the app</i>");
  }
  if (lines.length <= 1) return null;
  return msgBlockquote(lines);
}

/** Truncate HTML safely so Telegram caption limits do not break mid-tag. */
function truncateHtmlSafe(html: string, maxBodyLen: number): string {
  if (html.length <= maxBodyLen) return html;
  let cut = html.slice(0, maxBodyLen);
  const lastNl = cut.lastIndexOf("\n");
  if (lastNl > maxBodyLen * 0.55) cut = cut.slice(0, lastNl);
  cut = cut.replace(/<[^>]*$/, "");
  return `${cut}…`;
}

/** Appends website + support email to every outbound Telegram message. */
function withTelegramFooter(body: string, mode: "html" | "plain", maxLen?: number): string {
  const footer = mode === "html" ? telegramFooterHtml() : telegramFooterPlain();
  if (maxLen != null && body.length + footer.length > maxLen) {
    const allowed = Math.max(0, maxLen - footer.length - 1);
    body = mode === "html" ? truncateHtmlSafe(body, allowed) : `${body.slice(0, allowed)}…`;
  }
  return body + footer;
}

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
  const base = `• ${escapeHtml(item.name)}${escapeHtml(DOT)}${escapeHtml(qtyUnit)}`;
  if (typeof item.price === "number" && item.price >= 0) {
    return `${base}${escapeHtml(DOT)}<b>₹${escapeHtml(String(item.price.toLocaleString("en-IN")))}</b>`;
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
  billCount?: number;
  variant?: "created" | "updated" | "pending" | "approved" | "rejected" | "settlement";
  settlementToName?: string;
  rejectionReason?: string;
  approvedByName?: string;
  rejectedByName?: string;
  totalSpent?: number | null;
};

export type ExpenseNotifyMode = "created" | "updated" | "pending" | "approved";

function formatExpenseAlertHtml(data: ExpenseAlertPayload): string {
  const amt = boldRupee(data.amount);
  const variant = data.variant ?? "created";
  const { icon, subtitle } = expenseVariantMeta(variant);

  if (variant === "settlement") {
    const to = escapeHtml(data.settlementToName ?? "?");
    const parts = [
      msgBanner(data.appName, subtitle, icon),
      "",
      msgBlockquote([
        `<b>🤝 ${escapeHtml(data.payerName)}</b> → <b>${to}</b>`,
        `💰 ${amt}`,
        `📅 ${escapeHtml(data.dateLine)}`,
      ]),
    ];
    const wallet = formatWalletCard(data);
    if (wallet) parts.push("", wallet);
    if (data.detailUrl) {
      parts.push("", msgOpenLink(data.detailUrl, "🔗 Open ledger"));
    }
    return parts.join("\n");
  }

  const parts: string[] = [msgBanner(data.appName, subtitle, icon), ""];

  const statusLine = formatStatusLine(data, variant);
  if (statusLine) {
    parts.push(statusLine, "");
  }

  parts.push(formatExpenseCard(data, amt));

  const showWallet = variant !== "pending" && variant !== "rejected";
  if (showWallet) {
    const wallet = formatWalletCard(data);
    if (wallet) parts.push("", wallet);
  }

  if (data.hasBill) {
    const count = data.billCount ?? 1;
    parts.push(
      "",
      count > 1 ? "<b>📎 Receipts attached below</b>" : "<b>📎 Receipt attached below</b>",
    );
  }

  if (data.detailUrl) {
    parts.push("", msgOpenLink(data.detailUrl));
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
    msgBanner(data.appName, "New month started", "🌙"),
    "",
    msgBlockquote([
      `<b>📆 ${escapeHtml(data.monthLabel)}</b>`,
      `💰 Monthly wallet ${b}`,
    ]),
  ];
  if (carryLine) lines.push("", `<i>${escapeHtml(carryLine)}</i>`);
  if (data.detailUrl) {
    lines.push("", msgOpenLink(data.detailUrl));
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
    msgBanner(data.appName, "Monthly wallet updated", "💰"),
    "",
    msgBlockquote([
      `<b>📆 ${escapeHtml(data.monthLabel)}</b>`,
      `Budget set to ${b}`,
    ]),
  ];
  if (data.detailUrl) {
    lines.push("", msgOpenLink(data.detailUrl));
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
    msgBanner(data.appName, "Wallet topped up", "💰"),
    "",
    msgBlockquote([
      `<b>📆 ${escapeHtml(data.monthLabel)}</b>`,
      `${boldRupee(data.previousBudget)} <i>+</i> ${boldRupee(data.additionalAmount)}`,
      `<b>= ${boldRupee(data.budget)}</b>`,
    ]),
  ];
  if (data.detailUrl) {
    lines.push("", msgOpenLink(data.detailUrl));
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
  dedupeKey?: string;
}): Promise<void> {
  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
  };

  try {
    if (!isTelegramConfigured()) {
      await recordEvent({
        eventType: input.eventType,
        status: "skipped",
        message: "Telegram TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing",
        metadata,
      });
      return;
    }

    if (input.dedupeKey) {
      const duplicate = await hasRecentNotificationDuplicate({
        channel: "telegram",
        dedupeKey: input.dedupeKey,
      });
      if (duplicate) {
        await recordEvent({
          eventType: input.eventType,
          status: "skipped",
          message: "Duplicate suppressed (recent identical send)",
          metadata,
        });
        return;
      }
    }

    const captionBody = input.captionHtml
      ? withTelegramFooter(input.captionHtml, "html", TELEGRAM_CAPTION_MAX)
      : undefined;
    const htmlBody = input.html ? withTelegramFooter(input.html, "html") : undefined;
    const textFallbackBody =
      htmlBody ??
      (input.captionHtml ? withTelegramFooter(input.captionHtml, "html") : undefined);
    const plainBody = input.plain ? withTelegramFooter(input.plain, "plain") : undefined;

    let result: {
      ok: boolean;
      error?: string;
      usedPlainFallback?: boolean;
      usedBytesUpload?: boolean;
    };

    if (input.imageUrl?.trim() && captionBody) {
      result = await sendTelegramImage(input.imageUrl.trim(), captionBody);
      if (!result.ok && textFallbackBody) {
        const textFallback = await sendTelegramMessage(
          `${textFallbackBody}\n\n📎 <i>Receipt image is in the app.</i>`,
        );
        if (textFallback.ok) {
          result = {
            ok: true,
            usedPlainFallback: true,
          };
        }
      }
    } else if (htmlBody ?? textFallbackBody) {
      result = await sendTelegramMessage(htmlBody ?? textFallbackBody!);
    } else if (plainBody) {
      result = await sendTelegramPlainMessage(plainBody);
    } else {
      await recordEvent({
        eventType: input.eventType,
        status: "failed",
        message: "No message content to send",
        metadata,
      });
      return;
    }

    const successNote = result.ok
      ? result.usedBytesUpload
        ? "Sent (direct photo upload)"
        : result.usedPlainFallback
          ? "Sent (plain-text fallback)"
          : undefined
      : result.error ?? "Telegram API request failed";

    await recordEvent({
      eventType: input.eventType,
      status: result.ok ? "sent" : "failed",
      message: successNote,
      metadata: {
        ...metadata,
        ...(result.error && !result.ok ? { telegramError: result.error } : {}),
      },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown pipeline error";
    console.error("[telegram-notify] sendPipeline", e);
    try {
      await recordEvent({
        eventType: input.eventType,
        status: "failed",
        message: errMsg,
        metadata,
      });
    } catch (recordErr) {
      console.error("[telegram-notify] record failure", recordErr);
    }
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
        msgBanner(appName, "Pre-bill finalized", "🧾"),
        "",
        msgBlockquote([`<b>🛒 ${escapeHtml(dto.title)}</b>`, itemLines]),
        "",
        `<i>👤 ${escapeHtml(creatorName)}${escapeHtml(DOT)}📅 ${escapeHtml(dateLine)}</i>`,
      ];
      if (detailUrl) {
        html.push("", msgOpenLink(detailUrl));
      }
      await sendPipeline({
        html: html.join("\n"),
        eventType: "telegram_pre_bill_finalized",
        metadata: { preBillId: dto._id, title: dto.title },
        dedupeKey: `prebill:${dto._id}:finalized`,
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
        msgBanner(appName, "Pre-bill updated", "✏️"),
        "",
        msgBlockquote([`<b>🛒 ${escapeHtml(dto.title)}</b>`, itemLines]),
      ];
      if (dto.notes?.trim()) {
        html.push("", `<i>📝 ${escapeHtml(dto.notes.trim())}</i>`);
      }
      html.push("", `<i>👤 ${escapeHtml(editorName)}${escapeHtml(DOT)}📅 ${escapeHtml(dateLine)}</i>`);
      if (detailUrl) {
        html.push("", msgOpenLink(detailUrl));
      }
      await sendPipeline({
        html: html.join("\n"),
        eventType: "telegram_pre_bill_edited",
        metadata: { preBillId: dto._id, title: dto.title },
        dedupeKey: `prebill:${dto._id}:edited:${Date.now()}`,
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
        msgBanner(appName, "Shopping complete", "✅"),
        "",
        msgBlockquote([`<b>🛒 ${escapeHtml(t)}</b>`, "<i>All items marked purchased</i>"]),
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

function resolveExpenseNotifyMode(dto: ExpenseDTO, mode: ExpenseNotifyMode): ExpenseNotifyMode {
  if (mode === "created" && dto.status === "pending") return "pending";
  return mode;
}

function expenseEventType(mode: ExpenseNotifyMode): string {
  switch (mode) {
    case "pending":
      return "telegram_expense_pending";
    case "approved":
      return "telegram_expense_approved";
    case "updated":
      return "telegram_expense_updated";
    default:
      return "telegram_expense_created";
  }
}

async function buildExpenseAlert(
  dto: ExpenseDTO,
  mode: ExpenseNotifyMode,
  extras?: { approvedByName?: string },
): Promise<{ caption: string; monthKey: string; bill?: string }> {
  const resolvedMode = resolveExpenseNotifyMode(dto, mode);
  const appName = await getHouseDisplayName();
  const payer = await User.findById(dto.paidBy).lean();
  const payerName = payer?.name ?? "Someone";
  const cat = dto.category as ExpenseCategory;
  const meta = CATEGORY_META[cat];
  const categoryEmoji = meta?.emoji ?? "💸";
  const categoryLabel = dto.category;

  const expenseDate = new Date(dto.date);
  const monthKey = monthKeyFromDate(expenseDate);
  const dateLine = format(expenseDate, "d MMM yyyy");

  const includeWallet = resolvedMode !== "pending";
  let remaining: number | null = null;
  let budget: number | null = null;
  let totalSpent: number | null = null;
  let budgetUsagePercent: number | null = null;

  if (includeWallet) {
    const wallet = await getMonthWalletSnapshot(monthKey);
    remaining = wallet.remaining;
    budget = wallet.budget;
    totalSpent = wallet.totalSpent;
    budgetUsagePercent =
      budget != null && budget > 0 ? Math.round((totalSpent / budget) * 100) : null;
  }

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
  const billImages = normalizeBillImages({ billImages: dto.billImages, billImage: dto.billImage });
  const bill = primaryBillImage(billImages);

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
    totalSpent,
    budgetUsagePercent,
    detailUrl: detailUrl ?? undefined,
    hasBill: billImages.length > 0,
    billCount: billImages.length,
    variant: resolvedMode,
    approvedByName: extras?.approvedByName,
  };

  return {
    caption: formatExpenseAlertHtml(alert),
    monthKey,
    bill: bill,
  };
}

export function notifyTelegramExpense(
  dto: ExpenseDTO,
  mode: ExpenseNotifyMode = "created",
  extras?: { approvedByName?: string },
): void {
  void (async () => {
    try {
      await connectDb();
      const resolvedMode = resolveExpenseNotifyMode(dto, mode);
      const { caption, monthKey, bill } = await buildExpenseAlert(dto, mode, extras);

      await sendPipeline({
        imageUrl: bill,
        captionHtml: bill ? caption : undefined,
        html: bill ? undefined : caption,
        eventType: expenseEventType(resolvedMode),
        metadata: {
          expenseId: dto._id,
          monthKey,
          expenseTitle: dto.title,
          expenseStatus: dto.status,
          mode: resolvedMode,
        },
        dedupeKey: `expense:${dto._id}:${resolvedMode}`,
      });
    } catch (e) {
      console.error("[telegram-notify] expense pipeline", e);
    }
  })();
}

export function notifyTelegramExpenseRejected(
  dto: ExpenseDTO,
  reason: string,
  rejectedByName?: string,
): void {
  void (async () => {
    try {
      await connectDb();
      const appName = await getHouseDisplayName();
      const payer = await User.findById(dto.paidBy).lean();
      const payerName = payer?.name ?? "Someone";
      const cat = dto.category as ExpenseCategory;
      const meta = CATEGORY_META[cat];
      const expenseDate = new Date(dto.date);
      const monthKey = monthKeyFromDate(expenseDate);
      const detailUrl = appDetailUrl(monthKey);

      const html = formatExpenseAlertHtml({
        appName,
        title: dto.title,
        payerName,
        amount: dto.amount,
        categoryEmoji: meta?.emoji ?? "💸",
        categoryLabel: dto.category,
        dateLine: format(expenseDate, "d MMM yyyy"),
        isSplit: dto.splitEnabled !== false,
        splitCount: dto.splitBetween.length,
        walletRemaining: null,
        budget: null,
        budgetUsagePercent: null,
        detailUrl: detailUrl ?? undefined,
        variant: "rejected",
        rejectionReason: reason.trim() || undefined,
        rejectedByName,
      });

      await sendPipeline({
        html,
        eventType: "telegram_expense_rejected",
        metadata: {
          expenseId: dto._id,
          monthKey,
          expenseTitle: dto.title,
          reason: reason.trim(),
        },
        dedupeKey: `expense:${dto._id}:rejected`,
      });
    } catch (e) {
      console.error("[telegram-notify] expense rejected", e);
    }
  })();
}

export function notifyTelegramSettlementRecorded(
  settlementId: string,
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
      const { remaining, budget, totalSpent } = await getMonthWalletSnapshot(monthKey);
      const budgetUsagePercent =
        budget != null && budget > 0 ? Math.round((totalSpent / budget) * 100) : null;
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
        walletRemaining: remaining,
        budget,
        totalSpent,
        budgetUsagePercent,
        detailUrl: detailUrl ?? undefined,
        variant: "settlement",
        settlementToName: to?.name ?? "?",
      });
      await sendPipeline({
        html,
        eventType: "telegram_settlement",
        metadata: {
          settlementId,
          fromUserId,
          toUserId,
          amount,
          monthKey,
        },
        dedupeKey: `settlement:${settlementId}`,
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
        dedupeKey: `wallet:${monthKey}:amend:${amounts.additionalAmount}`,
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
