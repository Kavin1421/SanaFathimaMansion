import { resolve } from "node:path";
import qrcode from "qrcode-terminal";
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

  client = new wweb.Client({
    authStrategy: new wweb.LocalAuth({ dataPath: getDataPath() }),
    puppeteer: {
      headless: true,
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

  client.on("qr", (qr) => {
    console.log("Scan this QR with WhatsApp (Linked devices):");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("WhatsApp authenticated");
  });

  client.on("auth_failure", (msg) => {
    console.error("WhatsApp auth failure:", msg);
    rejectReady(new Error(`Auth failure: ${msg}`));
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

    console.log("WhatsApp client ready");
    resolveReady();
  });

  client.on("disconnected", (reason) => {
    console.warn("WhatsApp disconnected:", reason);
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
  wa.initialize().catch((err) => {
    console.error("Failed to initialize WhatsApp client:", err);
    rejectReady(err instanceof Error ? err : new Error(String(err)));
  });
}
