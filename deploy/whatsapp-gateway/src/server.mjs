import express from "express";
import Redis from "ioredis";
import mongoose from "mongoose";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";

const PORT = Number(process.env.PORT || 3020);
const TOKEN = process.env.WHATSAPP_GATEWAY_TOKEN?.trim() || "";
const REDIS_URL = process.env.REDIS_URL?.trim() || "";
const AUTH_DIR = process.env.AUTH_DIR || "/data/auth";
const ORDER_KEY = "sana:wa:order";
const STAMP_AFTER_MS = 20_000;
const MAX_ATTEMPTS = 8;
const RECONCILE_AGE_MS = 8_000;
const SEND_GAP_MS = 1_000;
const CAPTION_MAX = 1024;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

if (!REDIS_URL) {
  console.error("REDIS_URL is required");
  process.exit(1);
}
if (!TOKEN) {
  console.error("WHATSAPP_GATEWAY_TOKEN is required");
  process.exit(1);
}

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
redis.on("error", (err) => console.error("[redis]", err.message));

const outboxSchema = new mongoose.Schema(
  {
    queueId: { type: String, required: true, unique: true },
    text: String,
    imageUrls: [String],
    eventType: String,
    status: String,
    offlineAtEnqueue: Boolean,
    attempts: Number,
    lastError: String,
    sentAt: Date,
  },
  { collection: "whatsapp_outbox", timestamps: true },
);

const notificationEventSchema = new mongoose.Schema(
  {
    channel: String,
    eventType: String,
    status: String,
    message: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { collection: "notificationevents", timestamps: { createdAt: true, updatedAt: false } },
);

const Outbox = mongoose.models.WhatsAppOutboxGateway || mongoose.model("WhatsAppOutboxGateway", outboxSchema);
const NotificationEvent =
  mongoose.models.NotificationEventGateway || mongoose.model("NotificationEventGateway", notificationEventSchema);

let sock = null;
let connection = "close";
let latestQr = null;
let resolvedJid = "";
let lastSendAt = 0;
let reconnectTimer = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jobKey(queueId) {
  return `sana:wa:job:${queueId}`;
}

function toJid() {
  const value = (resolvedJid || process.env.WHATSAPP_TO || "").trim();
  if (!value) return null;
  if (value.includes("@")) return value;
  const digits = value.replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : null;
}

async function resolveGroup() {
  if (!sock || connection !== "open") return;
  const wantedName = (process.env.WHATSAPP_GROUP_NAME || "").trim();
  const invite = (process.env.WHATSAPP_GROUP_INVITE || "").trim();
  const explicit = (process.env.WHATSAPP_TO || "").trim();
  if (explicit.includes("@g.us") || explicit.includes("@s.whatsapp.net")) {
    resolvedJid = explicit;
    return;
  }

  const pickByName = async () => {
    const groups = await sock.groupFetchAllParticipating();
    const match = Object.values(groups).find((group) => wantedName && group.subject === wantedName);
    if (!match?.id) return false;
    resolvedJid = match.id;
    console.log("[whatsapp] using group", match.subject);
    return true;
  };

  try {
    if (await pickByName()) return;
  } catch (error) {
    console.error("[whatsapp] group list failed", error instanceof Error ? error.message : error);
  }

  if (!invite) {
    if (explicit) resolvedJid = explicit;
    return;
  }

  try {
    const jid = await sock.groupAcceptInvite(invite);
    if (jid) {
      resolvedJid = jid;
      console.log("[whatsapp] joined group", wantedName || "invite");
      return;
    }
  } catch (error) {
    console.error("[whatsapp] invite failed", error instanceof Error ? error.message : error);
  }

  try {
    await pickByName();
  } catch (error) {
    console.error("[whatsapp] group list retry failed", error instanceof Error ? error.message : error);
  }
}

function shouldStamp(job) {
  if (job.offlineAtEnqueue) return true;
  const created = Date.parse(job.createdAt || "") || Date.now();
  return Date.now() - created >= STAMP_AFTER_MS;
}

function blockedImageHost(hostname) {
  const host = String(hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "0.0.0.0" || host === "::1" || host === "169.254.169.254") return true;
  if (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function sanitizeImageUrls(value) {
  if (!Array.isArray(value)) return [];
  const urls = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const raw = item.trim();
    if (!raw) continue;
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    if (blockedImageHost(parsed.hostname)) continue;
    urls.push(raw);
    if (urls.length >= MAX_IMAGES) break;
  }
  return urls;
}

function sniffImageMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

async function downloadImage(url) {
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) throw new Error("image size");
  const header = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const mime = header.startsWith("image/") ? header : sniffImageMime(buffer);
  if (!mime) throw new Error("not an image");
  return { buffer, mime };
}

async function loadImages(urls) {
  const images = [];
  for (const url of sanitizeImageUrls(urls)) {
    try {
      images.push(await downloadImage(url));
    } catch (error) {
      console.error("[whatsapp] image", error instanceof Error ? error.message : error);
    }
  }
  return images;
}

function formatQueued(text, queueId) {
  const mark = `Queued as ${queueId}`;
  if (text.includes(mark)) return text;
  return `${text.trim()}\n\n—\n${mark}\nHeld while WhatsApp was offline, delivered when it returned.`;
}

async function markOutbox(queueId, fields) {
  if (mongoose.connection.readyState !== 1) return;
  await Outbox.updateOne({ queueId }, { $set: fields });
}

async function markNotification(queueId, status, message) {
  if (mongoose.connection.readyState !== 1) return;
  await NotificationEvent.updateMany(
    { channel: "whatsapp", "metadata.queueId": queueId, status: "queued" },
    { $set: { status, message } },
  );
}

async function enqueue(job) {
  await redis.hset(jobKey(job.queueId), { payload: JSON.stringify(job) });
  const pos = await redis.lpos(ORDER_KEY, job.queueId);
  if (pos === null) await redis.rpush(ORDER_KEY, job.queueId);
  await markOutbox(job.queueId, {
    status: "queued",
    offlineAtEnqueue: Boolean(job.offlineAtEnqueue),
    lastError: job.lastError || "",
    attempts: job.attempts || 0,
  });
}

async function pace() {
  const wait = Math.max(0, SEND_GAP_MS - (Date.now() - lastSendAt));
  if (wait) await sleep(wait);
}

async function deliver(job) {
  const jid = toJid();
  if (!jid) throw new Error("WhatsApp recipient is not set");
  if (!sock || connection !== "open") throw new Error("WhatsApp is not connected");
  const requested = sanitizeImageUrls(job.imageUrls);
  const images = await loadImages(requested);
  let body = shouldStamp(job) ? formatQueued(job.text, job.queueId) : job.text;
  if (requested.length > 0 && images.length === 0) {
    const links = requested.map((url, index) => `Receipt ${index + 1}: ${url}`).join("\n");
    body = `${body}\n\n${links}`;
  }
  await pace();
  if (images.length === 0) {
    await sock.sendMessage(jid, { text: body });
    lastSendAt = Date.now();
  } else if (body.length <= CAPTION_MAX) {
    await sock.sendMessage(jid, { image: images[0].buffer, caption: body, mimetype: images[0].mime });
    lastSendAt = Date.now();
    for (const image of images.slice(1)) {
      await pace();
      await sock.sendMessage(jid, { image: image.buffer, mimetype: image.mime });
      lastSendAt = Date.now();
    }
  } else {
    await sock.sendMessage(jid, { text: body });
    lastSendAt = Date.now();
    for (const image of images) {
      await pace();
      await sock.sendMessage(jid, { image: image.buffer, mimetype: image.mime });
      lastSendAt = Date.now();
    }
  }
  await markOutbox(job.queueId, { status: "sent", sentAt: new Date(), lastError: "" });
  await markNotification(
    job.queueId,
    "sent",
    shouldStamp(job) ? `Delivered from queue ${job.queueId}` : `Sent (${job.queueId})`,
  );
  console.log("[whatsapp] sent", job.queueId, shouldStamp(job) ? "stamped" : "live");
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startSocket().catch((err) => console.error("[whatsapp] restart", err));
  }, 4_000);
}

async function startSocket() {
  if (sock) return;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: "warn" });
  const next = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.ubuntu("Sana WhatsApp"),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });
  sock = next;
  next.ev.on("creds.update", saveCreds);
  next.ev.on("connection.update", (update) => {
    if (update.qr) {
      latestQr = update.qr;
      console.log("[whatsapp] scan this QR to link the household number");
      qrcodeTerminal.generate(update.qr, { small: true });
    }
    if (update.connection === "open") {
      connection = "open";
      latestQr = null;
      console.log("[whatsapp] connected");
      resolveGroup().catch((error) => {
        console.error("[whatsapp] resolve group", error instanceof Error ? error.message : error);
      });
    }
    if (update.connection === "close") {
      connection = "close";
      sock = null;
      const code = update.lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.error("[whatsapp] disconnected", code, loggedOut ? "logged out" : "will retry");
      if (!loggedOut) scheduleReconnect();
      else console.error("[whatsapp] session logged out — open /v1/qr and scan again");
    }
  });
}

async function reconcile() {
  if (mongoose.connection.readyState !== 1) return;
  const cutoff = new Date(Date.now() - RECONCILE_AGE_MS);
  const docs = await Outbox.find({ status: "queued", createdAt: { $lte: cutoff } })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();
  for (const doc of docs) {
    const exists = await redis.exists(jobKey(doc.queueId));
    if (exists) continue;
    await enqueue({
      queueId: doc.queueId,
      text: doc.text,
      imageUrls: sanitizeImageUrls(doc.imageUrls),
      eventType: doc.eventType,
      createdAt: (doc.createdAt || new Date()).toISOString(),
      offlineAtEnqueue: Boolean(doc.offlineAtEnqueue) || connection !== "open",
      attempts: doc.attempts || 0,
    });
    console.log("[reconcile] picked up", doc.queueId);
  }
}

function waitingError(message) {
  return /not set|not connected/i.test(message || "");
}

let lastReconcileAt = 0;

async function maybeReconcile() {
  if (Date.now() - lastReconcileAt < 5_000) return;
  lastReconcileAt = Date.now();
  await reconcile();
}

async function sendLoop() {
  for (;;) {
    try {
      if (connection !== "open") {
        await sleep(2_000);
        continue;
      }
      await maybeReconcile();
      const queueId = await redis.lindex(ORDER_KEY, 0);
      if (!queueId) {
        await sleep(2_000);
        continue;
      }
      const raw = await redis.hget(jobKey(queueId), "payload");
      if (!raw) {
        await redis.lpop(ORDER_KEY);
        continue;
      }
      const job = JSON.parse(raw);
      try {
        await deliver(job);
        await redis.lpop(ORDER_KEY);
        await redis.del(jobKey(queueId));
      } catch (error) {
        const message = error instanceof Error ? error.message : "send failed";
        job.attempts = (job.attempts || 0) + (waitingError(message) ? 0 : 1);
        job.lastError = message;
        job.offlineAtEnqueue = true;
        await redis.hset(jobKey(queueId), { payload: JSON.stringify(job) });
        if (waitingError(message)) {
          await sleep(3_000);
          continue;
        }
        if (job.attempts >= MAX_ATTEMPTS) {
          await redis.lpop(ORDER_KEY);
          await redis.del(jobKey(queueId));
          await markOutbox(queueId, { status: "failed", lastError: message, attempts: job.attempts });
          await markNotification(queueId, "failed", message);
          console.error("[whatsapp] dropped", queueId, message);
        } else {
          await sleep(Math.min(30_000, 1_000 * job.attempts));
        }
      }
    } catch (error) {
      console.error("[send-loop]", error);
      await sleep(3_000);
    }
  }
}

function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  let pending = 0;
  let redisUp = false;
  try {
    pending = await redis.llen(ORDER_KEY);
    redisUp = redis.status === "ready";
  } catch {
    redisUp = false;
  }
  res.json({
    ok: redisUp,
    whatsapp: connection,
    redis: redisUp ? "up" : "down",
    pending,
    recipientConfigured: Boolean(toJid()),
    groupName: process.env.WHATSAPP_GROUP_NAME || null,
    pairing: Boolean(latestQr),
  });
});

app.get("/v1/qr", requireAuth, async (_req, res) => {
  if (connection === "open") {
    res.json({ status: "connected" });
    return;
  }
  if (!latestQr) {
    res.status(404).json({ error: "QR not ready yet" });
    return;
  }
  const dataUrl = await QRCode.toDataURL(latestQr);
  res.json({ status: "pairing", qr: dataUrl });
});

app.post("/v1/jobs", requireAuth, async (req, res) => {
  const body = req.body || {};
  const queueId = typeof body.queueId === "string" ? body.queueId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!queueId || !text) {
    res.status(400).json({ error: "queueId and text are required" });
    return;
  }
  const job = {
    queueId,
    text: text.slice(0, 4000),
    imageUrls: sanitizeImageUrls(body.imageUrls),
    eventType: typeof body.eventType === "string" ? body.eventType : "whatsapp_text",
    createdAt: typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString(),
    offlineAtEnqueue: Boolean(body.offlineAtEnqueue) || connection !== "open",
    attempts: 0,
  };

  if (connection === "open" && !job.offlineAtEnqueue) {
    try {
      await deliver(job);
      res.json({ status: "sent", queueId });
      return;
    } catch (error) {
      job.offlineAtEnqueue = true;
      job.lastError = error instanceof Error ? error.message : "send failed";
    }
  }

  await enqueue(job);
  res.json({ status: "queued", queueId });
});

async function main() {
  if (process.env.MONGO_URL) {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.MONGO_DB_NAME || "sanaFathimaMansion",
    });
    console.log("[mongo] connected");
  } else {
    console.warn("[mongo] MONGO_URL is not set — only jobs posted to /v1/jobs will be sent");
  }
  await startSocket();
  sendLoop().catch((err) => console.error("[send-loop] fatal", err));
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[whatsapp-gateway] listening on ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
