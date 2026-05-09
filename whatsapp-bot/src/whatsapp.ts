import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import qrcode from "qrcode";
import wweb from "whatsapp-web.js";

type Chat = wweb.Chat;
type Client = wweb.Client;

function getDataPath(): string {
  const rel = process.env.WWEBJS_DATA_PATH?.trim() || ".wwebjs_auth";
  return resolve(process.cwd(), rel);
}

let client: Client | null = null;
let readyPromise: Promise<void>;
let resolveReady!: () => void;
let rejectReady!: (e: Error) => void;

function resetReadyGate() {
  readyPromise = new Promise<void>((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });
}

resetReadyGate();

export function isClientReady(): boolean {
  return client?.info !== undefined;
}

export function waitUntilReady(): Promise<void> {
  return readyPromise;
}

export function getClient(): Client {
  if (!client) {
    throw new Error("WhatsApp client not initialized");
  }
  return client;
}

export function createWhatsAppClient(): Client {
  if (client) {
    return client;
  }

  const detectedExecutablePath = (() => {
    if (process.env.PUPPETEER_EXECUTABLE_PATH?.trim()) {
      return process.env.PUPPETEER_EXECUTABLE_PATH.trim();
    }

    const cacheDir = process.env.PUPPETEER_CACHE_DIR?.trim();
    if (cacheDir) {
      const chromeRoot = join(cacheDir, "chrome");
      if (existsSync(chromeRoot)) {
        const versionDirs = readdirSync(chromeRoot, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort((a, b) => b.localeCompare(a));

        for (const versionDir of versionDirs) {
          const candidates = [
            join(chromeRoot, versionDir, "chrome-linux64", "chrome"),
            join(chromeRoot, versionDir, "chrome-linux", "chrome"),
            join(
              chromeRoot,
              versionDir,
              "chrome-mac-arm64",
              "Google Chrome for Testing.app",
              "Contents",
              "MacOS",
              "Google Chrome for Testing",
            ),
            join(
              chromeRoot,
              versionDir,
              "chrome-mac-x64",
              "Google Chrome for Testing.app",
              "Contents",
              "MacOS",
              "Google Chrome for Testing",
            ),
          ];

          for (const candidate of candidates) {
            if (existsSync(candidate)) {
              return candidate;
            }
          }
        }
      }
    }

    try {
      return puppeteer.executablePath();
    } catch {
      return undefined;
    }
  })();
  if (detectedExecutablePath) {
    console.log(`[WA_DEBUG] Chrome executable candidate: ${detectedExecutablePath}`);
    console.log(`[WA_DEBUG] Chrome executable exists: ${existsSync(detectedExecutablePath)}`);
  } else {
    console.warn("[WA_DEBUG] No Chrome executable path resolved");
  }
  client = new wweb.Client({
    authStrategy: new wweb.LocalAuth({ dataPath: getDataPath() }),
    puppeteer: {
      headless: true,
      executablePath: detectedExecutablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  });

  client.on("qr", async (qr) => {
    console.log("[WA] QR RECEIVED");
    try {
      const qrUrl = await qrcode.toDataURL(qr);
      console.log("\nOpen this in browser to scan:\n");
      console.log(qrUrl);
    } catch (err) {
      console.error("[WA] Failed to render QR data URL:", err);
    }
  });

  client.on("authenticated", () => {
    console.log("[WA] AUTHENTICATED");
  });

  client.on("auth_failure", (msg) => {
    console.error("[WA] AUTH FAILURE:", msg);
    rejectReady(new Error(`Auth failure: ${msg}`));
  });

  client.on("loading_screen", (percent, message) => {
    console.log(`[WA] LOADING ${percent}% ${message}`);
  });

  client.on("change_state", (state) => {
    console.log("[WA] STATE:", state);
  });

  client.on("ready", () => {
    // TEMP debug (uncomment to list group names + IDs for .env)
    // console.log("Bot is ready!");
    // void (async () => {
    //   try {
    //     const chats = await client!.getChats();
    //     chats.forEach((chat) => {
    //       if (chat.isGroup) {
    //         console.log("GROUP:", chat.name);
    //         console.log("ID:", chat.id._serialized);
    //         console.log("----------------------");
    //       }
    //     });
    //   } catch (e) {
    //     console.error("TEMP debug getChats failed:", e);
    //   }
    // })();

    console.log("[WA] READY");
    console.log("WhatsApp client ready");
    resolveReady();
  });

  client.on("disconnected", (reason) => {
    console.warn("[WA] DISCONNECTED:", reason);
    resetReadyGate();
  });

  // Future: parse commands (e.g. /help)
  client.on("message", () => {
    /* TODO: command handling */
  });

  return client;
}

let cachedTargetChat: Chat | null = null;

export async function getTargetChat(): Promise<Chat> {
  const wa = getClient();
  if (cachedTargetChat) {
    return cachedTargetChat;
  }

  const groupId = process.env.WHATSAPP_GROUP_ID?.trim();
  const groupName = process.env.WHATSAPP_GROUP_NAME?.trim();

  if (groupId) {
    cachedTargetChat = await wa.getChatById(groupId);
    return cachedTargetChat;
  }

  if (!groupName) {
    throw new Error("Set WHATSAPP_GROUP_ID or WHATSAPP_GROUP_NAME in .env");
  }

  const chats = await wa.getChats();
  const found = chats.find((c) => c.isGroup && c.name === groupName);
  if (!found) {
    throw new Error(`No group found with exact name "${groupName}"`);
  }

  cachedTargetChat = found;
  return cachedTargetChat;
}

export function startWhatsAppClient(): void {
  const wa = createWhatsAppClient();
  console.log("[WA_DEBUG] calling client.initialize()");
  wa.initialize().catch((err) => {
    console.error("Failed to initialize WhatsApp client:", err);
    rejectReady(err instanceof Error ? err : new Error(String(err)));
  });
}
