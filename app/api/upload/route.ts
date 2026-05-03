import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuthSession } from "@/lib/api-auth";
import { configureCloudinaryFromEnv } from "@/lib/cloudinary-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const b64 = `data:${mime};base64,${buf.toString("base64")}`;

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
