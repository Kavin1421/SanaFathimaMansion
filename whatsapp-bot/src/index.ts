import { config } from "dotenv";
import express from "express";
import type { Server } from "node:http";
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
  process.env.PUPPETEER_CACHE_DIR = resolve(process.cwd(), ".cache/puppeteer");
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

let hasStartedWhatsApp = false;

function onServerListening(listenPort: number): void {
  console.log(`Server running on port ${listenPort}`);
  console.log("POST /send-message with header x-bot-key and JSON body");
  if (process.env.PUPPETEER_CACHE_DIR) {
    console.log(`Puppeteer cache dir: ${process.env.PUPPETEER_CACHE_DIR}`);
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  }
  if (!hasStartedWhatsApp) {
    hasStartedWhatsApp = true;
    console.log("[WA_DEBUG] scheduling WhatsApp initialization in background");
    setImmediate(() => {
      startWhatsAppClient();
    });
  }
}

function listenWithFallback(port: number): Server {
  const server = app.listen(port, "0.0.0.0");
  server.on("listening", () => {
    onServerListening(port);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    const shouldTryNext = !isRender && err.code === "EADDRINUSE";
    if (shouldTryNext) {
      const nextPort = port + 1;
      console.warn(`[BOOT] Port ${port} is in use, retrying on ${nextPort}...`);
      listenWithFallback(nextPort);
      return;
    }
    console.error("Failed to start server:", err);
    process.exit(1);
  });
  return server;
}

listenWithFallback(PORT);

waitUntilReady().catch((err) => {
  console.error("WhatsApp did not become ready:", err);
});
