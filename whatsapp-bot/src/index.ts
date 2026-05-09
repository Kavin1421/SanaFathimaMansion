import { config } from "dotenv";
import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendMessageRouter } from "./routes/send-message.js";
import { isClientReady, startWhatsAppClient, waitUntilReady } from "./whatsapp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const rawPort = process.env.PORT || "3001";
const PORT = Number(rawPort);
if (!Number.isFinite(PORT) || PORT <= 0) {
  console.error(`Invalid PORT value: "${rawPort}"`);
  process.exit(1);
}
const isRender = process.env.RENDER === "true";

if (isRender && !process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = "/opt/render/.cache/puppeteer";
}

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${rawPort}`);
  console.log("POST /send-message with header x-bot-key and JSON body");
  if (process.env.PUPPETEER_CACHE_DIR) {
    console.log(`Puppeteer cache dir: ${process.env.PUPPETEER_CACHE_DIR}`);
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  }
  startWhatsAppClient();
});

waitUntilReady().catch((err) => {
  console.error("WhatsApp did not become ready:", err);
});
