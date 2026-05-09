import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer";

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${command} ${args.join(" ")} (exit ${code})`));
    });
  });
}

export async function ensureChromeAvailable(): Promise<string> {
  const executablePath = puppeteer.executablePath();
  if (existsSync(executablePath)) {
    console.log(`[WA_DEBUG] Chrome already installed: ${executablePath}`);
    return executablePath;
  }

  console.log("[WA_DEBUG] Chrome missing; installing in background...");
  await runCommand("npx", ["puppeteer", "browsers", "install", "chrome"]);

  const installedPath = puppeteer.executablePath();
  if (!existsSync(installedPath)) {
    throw new Error(`Chrome install completed but executable missing: ${installedPath}`);
  }

  console.log(`[WA_DEBUG] Chrome installed: ${installedPath}`);
  return installedPath;
}
