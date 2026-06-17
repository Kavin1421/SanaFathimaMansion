/**
 * Downloads curated free LottieFiles animations into public/lottie/.
 * Run: node scripts/fetch-lottie-assets.mjs
 *
 * Sources are Lottie Simple License community animations (LottieFiles CDN).
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const outDir = join(process.cwd(), "public", "lottie");
mkdirSync(outDir, { recursive: true });

/** @type {Record<string, string>} */
const SCENES = {
  // Finance / wallet illustration (Anim8*)
  "home-wallet.json":
    "https://assets1.lottiefiles.com/packages/lf20_uu0x8lqv.json",
  // Finance / chart illustration (Anim8*)
  "empty-chart.json":
    "https://assets1.lottiefiles.com/packages/lf20_uu0x8lqv.json",
  // Envelope / inbox
  "empty-inbox.json":
    "https://assets1.lottiefiles.com/packages/lf20_Cc8Bpg.json",
  // Checkmark success loop
  "all-caught-up.json":
    "https://assets1.lottiefiles.com/packages/lf20_s2lryxtd.json",
  // Payment successful burst (onboarding, etc.)
  "success-check.json":
    "https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json",
  // Razorpay-style expense recorded moment
  "expense-added.json":
    "https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json",
  // Reuse success burst for shopping complete
  "shopping-done.json":
    "https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json",
  // Quiet feed / paper plane
  "activity-quiet.json":
    "https://assets9.lottiefiles.com/packages/lf20_x62chJ.json",
  // Gentle error / failed state
  "gentle-error.json":
    "https://assets2.lottiefiles.com/packages/lf20_qp1spzqv.json",
};

for (const [file, url] of Object.entries(SCENES)) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${file} from ${url}: ${res.status}`);
  }
  const json = await res.json();
  if (!json.v || !Array.isArray(json.layers)) {
    throw new Error(`Invalid Lottie JSON for ${file}`);
  }
  const dest = join(outDir, file);
  writeFileSync(dest, JSON.stringify(json));
  const kb = (Buffer.byteLength(JSON.stringify(json)) / 1024).toFixed(1);
  console.log(`wrote ${file} (${kb} KB) <- ${json.nm ?? "animation"}`);
}
