import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import puppeteer from "puppeteer";

if (process.env.RENDER === "true" && !process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = "/opt/render/.cache/puppeteer";
}

const executablePath = puppeteer.executablePath();
if (existsSync(executablePath)) {
  console.log(`[ensure-chrome] Chrome already installed: ${executablePath}`);
  process.exit(0);
}

console.log("[ensure-chrome] Chrome not found. Installing via Puppeteer...");
execSync("npx puppeteer browsers install chrome", {
  stdio: "inherit",
  env: process.env,
});

const installedPath = puppeteer.executablePath();
if (!existsSync(installedPath)) {
  throw new Error(
    `[ensure-chrome] Chrome install reported success but executable still missing: ${installedPath}`,
  );
}

console.log(`[ensure-chrome] Chrome installed: ${installedPath}`);
