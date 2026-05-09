/** Opens Telegram’s share dialog with optional URL + body text. */
export function buildTelegramShareUrl(text: string, url?: string): string {
  const params = new URLSearchParams();
  if (url?.trim()) params.set("url", url.trim());
  params.set("text", text);
  return `https://t.me/share/url?${params.toString()}`;
}

/** Native share when available; otherwise caller should open `buildTelegramShareUrl`. */
export async function shareTextNative(text: string, title?: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({ title, text });
    return true;
  } catch {
    return false;
  }
}
