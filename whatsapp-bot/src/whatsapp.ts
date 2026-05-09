import { existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import qrcode from "qrcode";
import wweb from "whatsapp-web.js";

type Chat = wweb.Chat;
type Client = wweb.Client;

function getDataPath(): string {
  const fromEnv = process.env.WWEBJS_DATA_PATH?.trim();
  if (fromEnv) {
    return resolve(process.cwd(), fromEnv);
  }

  const renderDiskPath = process.env.RENDER_DISK_PATH?.trim();
  if (renderDiskPath) {
    return join(renderDiskPath, "whatsapp-auth");
  }

  return resolve(process.cwd(), ".wwebjs_auth");
}

let client: Client | null = null;
let readyPromise: Promise<void>;
let resolveReady!: () => void;
let rejectReady!: (e: Error) => void;
let chromeInstallPromise: Promise<void> | null = null;

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

  const authDataPath = getDataPath();
  console.log(`[WA_DEBUG] LocalAuth data path: ${authDataPath}`);
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
  const executableExists = detectedExecutablePath ? existsSync(detectedExecutablePath) : false;
  if (detectedExecutablePath) {
    console.log(`[WA_DEBUG] Chrome executable candidate: ${detectedExecutablePath}`);
    console.log(`[WA_DEBUG] Chrome executable exists: ${executableExists}`);
  } else {
    console.warn("[WA_DEBUG] No Chrome executable path resolved");
  }
  client = new wweb.Client({
    authStrategy: new wweb.LocalAuth({
      clientId: process.env.WWEBJS_CLIENT_ID?.trim() || "render-bot",
      dataPath: authDataPath,
    }),
    puppeteer: {
      headless: true,
      executablePath: executableExists ? detectedExecutablePath : undefined,
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

function isMissingChromeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Could not find Chrome") ||
    message.includes("Browser was not found at the configured executablePath")
  );
}

function installChromeIfNeeded(): Promise<void> {
  if (chromeInstallPromise) {
    return chromeInstallPromise;
  }
  chromeInstallPromise = new Promise<void>((resolvePromise, rejectPromise) => {
    console.log("[WA_DEBUG] Installing Chrome via Puppeteer fallback...");
    const child = spawn("npx", ["puppeteer", "browsers", "install", "chrome"], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", (e) => {
      chromeInstallPromise = null;
      rejectPromise(e);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        console.log("[WA_DEBUG] Chrome fallback install complete");
        resolvePromise();
      } else {
        chromeInstallPromise = null;
        rejectPromise(new Error(`Chrome install failed with exit code ${code}`));
      }
    });
  });
  return chromeInstallPromise;
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
  wa.initialize().catch(async (err) => {
    if (!isMissingChromeError(err)) {
      console.error("Failed to initialize WhatsApp client:", err);
      rejectReady(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    console.warn("[WA_DEBUG] Chrome missing at runtime; attempting one-time install...");
    try {
      await installChromeIfNeeded();
      client = null;
      const retry = createWhatsAppClient();
      console.log("[WA_DEBUG] retrying client.initialize() after Chrome install");
      await retry.initialize();
    } catch (retryErr) {
      console.error("Failed to initialize WhatsApp client:", retryErr);
      rejectReady(retryErr instanceof Error ? retryErr : new Error(String(retryErr)));
    }
  });
}
