import axios, { type AxiosResponse } from "axios";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

const BASE_URL = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : "";

/** Telegram Bot API caption limit for photos */
export const TELEGRAM_CAPTION_MAX = 1024;

const RETRY_DELAYS_MS = [500, 1200, 2500];
const MIN_SEND_GAP_MS = 400;

export type TelegramSendResult = {
  ok: boolean;
  error?: string;
  usedPlainFallback?: boolean;
  usedBytesUpload?: boolean;
};

export function isTelegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_ID && BASE_URL);
}

let lastSendAt = 0;
let sendChain: Promise<unknown> = Promise.resolve();

/** Serialize Telegram calls to reduce burst rate-limit failures. */
function enqueueTelegramSend<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const now = Date.now();
    const wait = Math.max(0, MIN_SEND_GAP_MS - (now - lastSendAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSendAt = Date.now();
    return fn();
  };
  const next = sendChain.then(run, run);
  sendChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function extractTelegramError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { description?: string; error_code?: number } | undefined;
    if (data?.description) {
      return data.error_code ? `${data.description} (${data.error_code})` : data.description;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown Telegram error";
}

function parseTelegramResponse(res: AxiosResponse): TelegramSendResult {
  const data = res.data as { ok?: boolean; description?: string; error_code?: number } | undefined;
  if (data?.ok === false) {
    const desc = data.description ?? "Telegram API rejected the request";
    return {
      ok: false,
      error: data.error_code ? `${desc} (${data.error_code})` : desc,
    };
  }
  return { ok: true };
}

function isRetryableError(error: string | undefined): boolean {
  if (!error) return true;
  const e = error.toLowerCase();
  return (
    e.includes("too many requests") ||
    e.includes("retry after") ||
    e.includes("timeout") ||
    e.includes("econnreset") ||
    e.includes("network") ||
    e.includes("429")
  );
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function postTelegramJson(
  endpoint: "sendMessage" | "sendPhoto",
  body: Record<string, unknown>,
): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) {
    return { ok: false, error: "Telegram not configured" };
  }
  try {
    const res = await axios.post(`${BASE_URL}/${endpoint}`, body, { timeout: 30_000 });
    return parseTelegramResponse(res);
  } catch (error) {
    return { ok: false, error: extractTelegramError(error) };
  }
}

async function postTelegramPhotoMultipart(
  buffer: Buffer,
  filename: string,
  mime: string,
  caption?: string,
  parseMode?: "HTML",
): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) {
    return { ok: false, error: "Telegram not configured" };
  }
  try {
    const form = new FormData();
    form.append("chat_id", CHAT_ID!);
    form.append("photo", new Blob([new Uint8Array(buffer)], { type: mime }), filename);
    if (caption) form.append("caption", caption);
    if (parseMode) form.append("parse_mode", parseMode);

    const res = await axios.post(`${BASE_URL}/sendPhoto`, form, { timeout: 60_000 });
    return parseTelegramResponse(res);
  } catch (error) {
    return { ok: false, error: extractTelegramError(error) };
  }
}

async function fetchImageBytes(url: string): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const res = await axios.get(url.trim(), {
      responseType: "arraybuffer",
      timeout: 45_000,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024,
    });
    const mime = String(res.headers["content-type"] ?? "image/jpeg").split(";")[0].trim() || "image/jpeg";
    return { buffer: Buffer.from(res.data), mime };
  } catch {
    return null;
  }
}

async function sendWithRetry(
  send: () => Promise<TelegramSendResult>,
): Promise<TelegramSendResult> {
  let last: TelegramSendResult = { ok: false, error: "No attempt made" };
  for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
    last = await enqueueTelegramSend(send);
    if (last.ok) return last;
    if (i >= RETRY_DELAYS_MS.length || !isRetryableError(last.error)) break;
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
  }
  return last;
}

/**
 * Sends a Telegram message. Prefer passing HTML from formatters; dynamic user copy should be escaped.
 */
export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) return { ok: false, error: "Telegram not configured" };

  const htmlResult = await sendWithRetry(() =>
    postTelegramJson("sendMessage", {
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  );
  if (htmlResult.ok) return htmlResult;

  const plain = stripHtmlTags(text);
  if (!plain) return htmlResult;

  const plainResult = await sendWithRetry(() =>
    postTelegramJson("sendMessage", {
      chat_id: CHAT_ID,
      text: plain,
      disable_web_page_preview: true,
    }),
  );
  return plainResult.ok ? { ok: true, usedPlainFallback: true } : plainResult;
}

/** Plain text (no parse_mode) — safe for arbitrary reminders without escaping. */
export async function sendTelegramPlainMessage(text: string): Promise<TelegramSendResult> {
  return sendWithRetry(() =>
    postTelegramJson("sendMessage", {
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  );
}

export async function sendTelegramImage(imageUrl: string, caption: string): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) return { ok: false, error: "Telegram not configured" };

  const cap =
    caption.length > TELEGRAM_CAPTION_MAX
      ? `${caption.slice(0, TELEGRAM_CAPTION_MAX - 1)}…`
      : caption;
  const url = imageUrl.trim();

  const photoResult = await sendWithRetry(() =>
    postTelegramJson("sendPhoto", {
      chat_id: CHAT_ID,
      photo: url,
      caption: cap,
      parse_mode: "HTML",
    }),
  );
  if (photoResult.ok) return photoResult;

  const plainCap = stripHtmlTags(cap);
  if (plainCap && plainCap !== cap) {
    const plainPhoto = await sendWithRetry(() =>
      postTelegramJson("sendPhoto", {
        chat_id: CHAT_ID,
        photo: url,
        caption: plainCap.slice(0, TELEGRAM_CAPTION_MAX),
      }),
    );
    if (plainPhoto.ok) return { ok: true, usedPlainFallback: true };
  }

  const fetched = await fetchImageBytes(url);
  if (fetched) {
    const bytesHtml = await sendWithRetry(() =>
      postTelegramPhotoMultipart(fetched.buffer, "receipt.jpg", fetched.mime, cap, "HTML"),
    );
    if (bytesHtml.ok) return { ok: true, usedBytesUpload: true };

    if (plainCap) {
      const bytesPlain = await sendWithRetry(() =>
        postTelegramPhotoMultipart(
          fetched.buffer,
          "receipt.jpg",
          fetched.mime,
          plainCap.slice(0, TELEGRAM_CAPTION_MAX),
        ),
      );
      if (bytesPlain.ok) {
        return { ok: true, usedPlainFallback: true, usedBytesUpload: true };
      }
    }

    const imageOnly = await sendWithRetry(() =>
      postTelegramPhotoMultipart(fetched.buffer, "receipt.jpg", fetched.mime),
    );
    if (imageOnly.ok) {
      const textFollowUp = await sendTelegramMessage(cap);
      return textFollowUp.ok
        ? { ok: true, usedBytesUpload: true, usedPlainFallback: textFollowUp.usedPlainFallback }
        : imageOnly;
    }
  }

  const textOnly = await sendTelegramMessage(`${cap}\n\n📎 <i>Receipt image is in the app.</i>`);
  if (textOnly.ok) {
    return { ok: true, usedPlainFallback: true };
  }

  return photoResult.error ? photoResult : textOnly;
}
