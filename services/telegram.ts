import axios from "axios";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

const BASE_URL = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : "";

/** Telegram Bot API caption limit for photos */
export const TELEGRAM_CAPTION_MAX = 1024;

export function isTelegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_ID && BASE_URL);
}

/**
 * Sends a Telegram message. Prefer passing HTML from formatters; dynamic user copy should be escaped.
 * Uses HTML parse mode for reliable formatting (Markdown breaks on underscores in names).
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  try {
    await axios.post(
      `${BASE_URL}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      { timeout: 20_000 },
    );
    return true;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
}

/** Plain text (no parse_mode) — safe for arbitrary reminders without escaping. */
export async function sendTelegramPlainMessage(text: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  try {
    await axios.post(
      `${BASE_URL}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text,
        disable_web_page_preview: true,
      },
      { timeout: 20_000 },
    );
    return true;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
}

export async function sendTelegramImage(imageUrl: string, caption: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  const cap =
    caption.length > TELEGRAM_CAPTION_MAX
      ? `${caption.slice(0, TELEGRAM_CAPTION_MAX - 1)}…`
      : caption;
  try {
    await axios.post(
      `${BASE_URL}/sendPhoto`,
      {
        chat_id: CHAT_ID,
        photo: imageUrl.trim(),
        caption: cap,
        parse_mode: "HTML",
      },
      { timeout: 25_000 },
    );
    return true;
  } catch (error) {
    console.error("Telegram image error:", error);
    return false;
  }
}
