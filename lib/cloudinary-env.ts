import { v2 as cloudinary } from "cloudinary";

export type CloudinaryConfigureResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Prefer `CLOUDINARY_URL` from the dashboard (“API environment variable”).
 * Otherwise use split vars; cloud_name is trimmed and lowercased (Cloudinary names are lowercase).
 */
export function configureCloudinaryFromEnv(): CloudinaryConfigureResult {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url && url.toLowerCase().startsWith("cloudinary://")) {
    cloudinary.config(true);
    return { ok: true };
  }

  const rawName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName = rawName?.toLowerCase();

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      ok: false,
      status: 501,
      message:
        "Cloudinary is not configured. Set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET.",
    };
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return { ok: true };
}
