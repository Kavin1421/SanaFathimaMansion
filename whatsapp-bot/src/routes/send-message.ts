import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { z } from "zod";
import { sendBillImage, sendExpenseMessage, sendWalletMessage } from "../senders.js";
import { getTargetChat, isClientReady, waitUntilReady } from "../whatsapp.js";

const expenseBody = z.object({
  type: z.literal("expense"),
  name: z.string().min(1),
  amount: z.union([z.number(), z.string()]),
  category: z.string().min(1),
  splitCount: z.number().int().positive(),
});

const walletBody = z.object({
  type: z.literal("wallet"),
  name: z.string().min(1),
  amount: z.union([z.number(), z.string()]),
});

const billBody = z.object({
  type: z.literal("bill"),
  imageUrl: z.string().url(),
  caption: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("type", [expenseBody, walletBody, billBody]);

function requireBotKey(req: Request, res: Response): boolean {
  const expected = process.env.WHATSAPP_BOT_API_KEY?.trim();
  if (!expected) {
    res.status(500).json({ error: "WHATSAPP_BOT_API_KEY is not configured" });
    return false;
  }
  const key = req.header("x-bot-key")?.trim();
  if (!key || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function sendMessageRouter(): Router {
  const r = createRouter();

  r.post("/send-message", async (req: Request, res: Response) => {
    if (!requireBotKey(req, res)) return;

    if (!isClientReady()) {
      try {
        await waitUntilReady();
      } catch {
        res.status(503).json({ error: "WhatsApp client failed to start. Check logs and session." });
        return;
      }
    }

    if (!isClientReady()) {
      res.status(503).json({ error: "WhatsApp client not ready" });
      return;
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }

    try {
      const chat = await getTargetChat();
      const payload = parsed.data;

      if (payload.type === "expense") {
        await sendExpenseMessage(chat, payload);
      } else if (payload.type === "wallet") {
        await sendWalletMessage(chat, payload);
      } else {
        await sendBillImage(chat, payload);
      }

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Send failed" });
    }
  });

  return r;
}
