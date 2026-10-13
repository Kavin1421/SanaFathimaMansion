import { describe, expect, it } from "vitest";
import {
  createQueueId,
  formatQueuedWhatsAppMessage,
  htmlToPlain,
  shouldStampQueueId,
} from "./whatsapp-queue";

describe("whatsapp queue", () => {
  it("builds a stable queue id", () => {
    expect(createQueueId(1_700_000_000_000)).toMatch(/^Q-[A-Z0-9]+$/);
  });

  it("stamps only held or old jobs", () => {
    const now = 1_000_000;
    expect(shouldStampQueueId({ offlineAtEnqueue: false, createdAtMs: now - 1000, nowMs: now })).toBe(false);
    expect(shouldStampQueueId({ offlineAtEnqueue: true, createdAtMs: now, nowMs: now })).toBe(true);
    expect(shouldStampQueueId({ offlineAtEnqueue: false, createdAtMs: now - 20_000, nowMs: now })).toBe(true);
  });

  it("adds the queue id once, after the message", () => {
    const once = formatQueuedWhatsAppMessage("Rent paid", "Q-ABC");
    expect(once.startsWith("Rent paid")).toBe(true);
    expect(once).toContain("Queued as Q-ABC");
    expect(formatQueuedWhatsAppMessage(once, "Q-ABC")).toBe(once);
  });

  it("strips telegram html", () => {
    expect(htmlToPlain("<b>Hi</b><br>there")).toBe("Hi\nthere");
  });
});
