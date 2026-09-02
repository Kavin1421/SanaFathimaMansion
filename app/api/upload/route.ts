import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuthSession } from "@/lib/api-auth";
import { configureCloudinaryFromEnv } from "@/lib/cloudinary-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

type ExtractedFile = {
  buffer: Buffer;
  mime: string;
  filename: string;
};

/** Pull boundary from Content-Type, or infer from the first multipart delimiter line. */
function resolveBoundary(contentType: string, body: Buffer): string | null {
  const fromHeader = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (fromHeader) {
    const value = (fromHeader[1] ?? fromHeader[2] ?? "").trim();
    if (value) return value;
  }

  // iOS / SW proxies sometimes drop `; boundary=...` from Content-Type while
  // the body is still valid multipart. Recover from the opening delimiter.
  const head = body.subarray(0, Math.min(body.length, 512)).toString("latin1");
  const firstLine = head.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.startsWith("--") && firstLine.length > 4) {
    return firstLine.slice(2).replace(/\r$/, "").trim();
  }
  return null;
}

/**
 * Minimal multipart parser for a single `file` part.
 * Avoids undici `request.formData()`, which throws "no boundary found in
 * multipart body" when Content-Type is incomplete.
 */
function extractFilePart(body: Buffer, boundary: string): ExtractedFile | null {
  const delimiter = Buffer.from(`--${boundary}`);
  const headerSep = Buffer.from("\r\n\r\n");

  let offset = indexOf(body, delimiter, 0);
  if (offset < 0) return null;
  offset += delimiter.length;
  if (body[offset] === 0x2d && body[offset + 1] === 0x2d) return null; // --boundary--
  if (body[offset] === 0x0d && body[offset + 1] === 0x0a) offset += 2;

  while (offset < body.length) {
    const headersEnd = indexOf(body, headerSep, offset);
    if (headersEnd < 0) return null;

    const headersRaw = body.subarray(offset, headersEnd).toString("utf8");
    const dataStart = headersEnd + headerSep.length;

    const nextDelim = indexOf(body, delimiter, dataStart);
    if (nextDelim < 0) return null;

    // Part body ends at CRLF just before the next --boundary
    let dataEnd = nextDelim;
    if (dataEnd >= 2 && body[dataEnd - 2] === 0x0d && body[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    }

    const disposition = /content-disposition:\s*([^\r\n]+)/i.exec(headersRaw)?.[1] ?? "";
    const nameMatch = /name="([^"]+)"/i.exec(disposition);
    const fieldName = nameMatch?.[1] ?? "";

    if (fieldName === "file") {
      const filenameMatch = /filename="([^"]*)"/i.exec(disposition);
      const mimeMatch = /content-type:\s*([^\r\n]+)/i.exec(headersRaw);
      return {
        buffer: body.subarray(dataStart, dataEnd),
        mime: (mimeMatch?.[1] ?? "image/jpeg").trim() || "image/jpeg",
        filename: filenameMatch?.[1] || "upload.jpg",
      };
    }

    offset = nextDelim + delimiter.length;
    if (body[offset] === 0x2d && body[offset + 1] === 0x2d) break;
    if (body[offset] === 0x0d && body[offset + 1] === 0x0a) offset += 2;
  }

  return null;
}

function indexOf(haystack: Buffer, needle: Buffer, from: number): number {
  return haystack.indexOf(needle, from);
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = configureCloudinaryFromEnv();
  if (!configured.ok) {
    return NextResponse.json({ error: configured.message }, { status: configured.status });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = Buffer.from(await req.arrayBuffer());

    if (!body.length) {
      return NextResponse.json({ error: "Empty upload body." }, { status: 400 });
    }
    if (body.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image is too large (max 10 MB)." },
        { status: 413 },
      );
    }

    let file: ExtractedFile | null = null;

    if (contentType.toLowerCase().includes("multipart/form-data") || body[0] === 0x2d) {
      const boundary = resolveBoundary(contentType, body);
      if (!boundary) {
        return NextResponse.json(
          { error: "Could not read multipart boundary from the upload." },
          { status: 400 },
        );
      }
      file = extractFilePart(body, boundary);
    } else if (contentType.toLowerCase().includes("application/json")) {
      // Optional fallback for clients that post a data URL
      try {
        const json = JSON.parse(body.toString("utf8")) as { dataUrl?: string; file?: string };
        const dataUrl = json.dataUrl ?? json.file;
        const match = typeof dataUrl === "string" ? /^data:([^;]+);base64,(.+)$/s.exec(dataUrl) : null;
        if (match) {
          file = {
            buffer: Buffer.from(match[2], "base64"),
            mime: match[1] || "image/jpeg",
            filename: "upload.jpg",
          };
        }
      } catch {
        /* fall through */
      }
    }

    if (!file || !file.buffer.length) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const mime = file.mime.startsWith("image/") ? file.mime : "image/jpeg";
    const b64 = `data:${mime};base64,${file.buffer.toString("base64")}`;

    const uploaded = await cloudinary.uploader.upload(b64, {
      folder: "sana-fathima-expenses",
      resource_type: "image",
    });

    return NextResponse.json({ url: uploaded.secure_url, publicId: uploaded.public_id });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    const httpCode = (e as { http_code?: number }).http_code;
    const invalidCloud = /invalid cloud_name/i.test(msg) || httpCode === 401;
    const hint = invalidCloud
      ? " Check CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME matches the Cloudinary dashboard (cloud name is usually lowercase)."
      : "";
    return NextResponse.json({ error: `Upload failed.${hint}` }, { status: 500 });
  }
}
