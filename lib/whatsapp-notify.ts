import { CATEGORY_META, type ExpenseCategory } from "@/lib/constants";
import { monthKeyFromDate } from "@/lib/dates";
import { connectDb } from "@/lib/db";
import { getHouseDisplayName } from "@/lib/house-name";
import { roundMoney } from "@/lib/ledger";
import { User } from "@/models/User";
import { getMonthWalletSnapshot } from "@/services/house-month";
import type { ExpenseDTO } from "@/types";
import { format, parse } from "date-fns";

/** Server-only. Set `IS_WHATSAPP_BOT_ENABLED=true` (or `1`, `yes`, `on`) to send; unset/false disables all bot calls. */
export function isWhatsAppBotEnabled(): boolean {
  const raw = process.env.IS_WHATSAPP_BOT_ENABLED?.trim();
  if (!raw) return false;
  return /^(1|true|yes|on)$/i.test(raw);
}

function baseUrl(): string | null {
  const u = process.env.WHATSAPP_BOT_URL?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

function apiKey(): string | null {
  const k = process.env.WHATSAPP_BOT_API_KEY?.trim();
  return k || null;
}

function appDetailUrl(monthKey: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/expenses?month=${encodeURIComponent(monthKey)}`;
}

async function post(body: Record<string, unknown>): Promise<void> {
  if (!isWhatsAppBotEnabled()) return;
  const base = baseUrl();
  const key = apiKey();
  if (!base || !key) return;

  try {
    const res = await fetch(`${base}/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-key": key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[whatsapp-notify]", res.status, t);
    }
  } catch (e) {
    console.error("[whatsapp-notify]", e);
  }
}

/**
 * Fire-and-forget: posts expense alert (+ optional bill image) to the WhatsApp group
 * configured on the bot (WHATSAPP_GROUP_ID). No-op if disabled, or URL/key missing.
 */
export function notifyWhatsAppExpense(
  dto: ExpenseDTO,
  mode: "created" | "updated" = "created",
): void {
  if (!isWhatsAppBotEnabled()) return;
  void (async () => {
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
      budget != null && budget > 0
        ? Math.round((totalSpent / budget) * 100)
        : null;

    const isSplit = dto.splitEnabled !== false;
    const n = dto.splitBetween.length;
    const sharePer =
      isSplit && n > 1 ? roundMoney(dto.amount / n) : null;

    const detailUrl = appDetailUrl(monthKey);

    await post({
      type: "expense",
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
      walletRemaining: remaining,
      budget,
      budgetUsagePercent,
      detailUrl: detailUrl ?? undefined,
      hasBill: Boolean(dto.billImage),
      variant: mode === "updated" ? "updated" : "created",
    });

    if (dto.billImage) {
      const amt = dto.amount.toLocaleString("en-IN");
      const caption = `🧾 *Receipt · ${dto.title}*\n*₹${amt}* · ${payerName}`.slice(0, 900);
      await post({
        type: "bill",
        imageUrl: dto.billImage,
        caption,
      });
    }
  })();
}

/** After a settlement is recorded in the app, mirror it to the group. */
export function notifyWhatsAppSettlementRecorded(
  fromUserId: string,
  toUserId: string,
  amount: number,
): void {
  if (!isWhatsAppBotEnabled()) return;
  void (async () => {
    await connectDb();
    const appName = await getHouseDisplayName();
    const [from, to] = await Promise.all([
      User.findById(fromUserId).lean(),
      User.findById(toUserId).lean(),
    ]);
    const monthKey = monthKeyFromDate(new Date());
    const detailUrl = appDetailUrl(monthKey);
    await post({
      type: "expense",
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
  })();
}

export function notifyWhatsAppMonthReset(
  monthKey: string,
  budget: number,
  options?: { carryForwardBalances?: boolean },
): void {
  if (!isWhatsAppBotEnabled()) return;
  void (async () => {
    await connectDb();
    const appName = await getHouseDisplayName();
    const detailUrl = appDetailUrl(monthKey);
    const monthStart = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
    const monthLabel = format(monthStart, "MMMM yyyy");
    await post({
      type: "month_reset",
      appName,
      monthKey,
      monthLabel,
      budget,
      detailUrl: detailUrl ?? undefined,
      carryForwardBalances: options?.carryForwardBalances,
    });
  })();
}
