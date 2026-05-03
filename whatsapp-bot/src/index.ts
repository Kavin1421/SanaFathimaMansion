import { config } from "dotenv";
import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendMessageRouter } from "./routes/send-message.js";
import { isClientReady, startWhatsAppClient, waitUntilReady } from "./whatsapp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.WHATSAPP_BOT_API_KEY?.trim()) {
  console.error("Set WHATSAPP_BOT_API_KEY in whatsapp-bot/.env");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, whatsappReady: isClientReady() });
});

app.use(sendMessageRouter());

app.listen(PORT, () => {
  console.log(`WhatsApp bot API listening on http://localhost:${PORT}`);
  console.log("POST /send-message with header x-bot-key and JSON body");
  startWhatsAppClient();
});

waitUntilReady().catch((err) => {
  console.error("WhatsApp did not become ready:", err);
});
