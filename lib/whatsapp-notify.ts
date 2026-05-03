import { CATEGORY_META, type ExpenseCategory } from "@/lib/constants";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import type { ExpenseDTO } from "@/types";

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
    const payer = await User.findById(dto.paidBy).lean();
    const payerName = payer?.name ?? "Someone";
    const meta = CATEGORY_META[dto.category as ExpenseCategory];
    const categoryLabel = meta ? `${meta.emoji} ${dto.category}` : dto.category;
    const categoryOut = mode === "updated" ? `✏️ ${categoryLabel}` : categoryLabel;

    await post({
      type: "expense",
      name: payerName,
      amount: dto.amount,
      category: categoryOut,
      splitCount: dto.splitBetween.length,
    });

    if (dto.billImage) {
      const caption = [dto.title, `${payerName} · ₹${dto.amount} · ${categoryLabel}`, dto.notes]
        .filter(Boolean)
        .join("\n")
        .slice(0, 900);
      await post({
        type: "bill",
        imageUrl: dto.billImage,
        caption: caption || "Bill",
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
    const [from, to] = await Promise.all([
      User.findById(fromUserId).lean(),
      User.findById(toUserId).lean(),
    ]);
    await post({
      type: "expense",
      name: from?.name ?? "?",
      amount,
      category: `💸 Settlement paid to ${to?.name ?? "?"}`,
      splitCount: 1,
    });
  })();
}
