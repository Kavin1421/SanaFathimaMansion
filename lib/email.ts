import nodemailer from "nodemailer";
import { renderAppEmail } from "@/lib/email-template";

function smtpUser(): string | null {
  return process.env.EMAIL_USER?.trim() || null;
}

function smtpPass(): string | null {
  return process.env.EMAIL_PASSWORD?.trim() || null;
}

function smtpHost(): string {
  return process.env.EMAIL_HOST?.trim() || "smtp.gmail.com";
}

function smtpPort(): number {
  const n = Number(process.env.EMAIL_PORT ?? 587);
  return Number.isFinite(n) ? n : 587;
}

function isSecurePort(port: number): boolean {
  return port === 465;
}

function appBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  return (url || "http://localhost:3000").replace(/\/$/, "");
}

function hasEmailConfig(): boolean {
  return Boolean(smtpUser() && smtpPass());
}

async function sendHtmlMail(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) return;
  const port = smtpPort();
  const transporter = nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure: isSecurePort(port),
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM?.trim() || user,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function sendInviteEmail(input: {
  to: string;
  name: string;
  houseName: string;
}): Promise<void> {
  if (!hasEmailConfig()) return;
  const appUrl = appBaseUrl();
  const subject = "You're invited to SanaFathima Mansion 🏠";
  const html = renderAppEmail({
    title: "You're invited to SanaFathima Mansion",
    greeting: `Hi ${input.name},`,
    lead: `You've been added to ${input.houseName} expense tracker.`,
    bullets: ["Track shared expenses", "See who owes whom", "Stay updated via WhatsApp"],
    ctaLabel: "Join Now",
    ctaHref: appUrl,
    footnote: "Let's keep things clear and fair. — Team Godevs (Kavin)",
  });
  const text = `Hi ${input.name},

You've been added to ${input.houseName} expense tracker.

Now you can:
- Track shared expenses
- See who owes whom
- Stay updated via WhatsApp

Join now: ${appUrl}

Let's keep things clear and fair.
- Team Godevs (Kavin)`;
  await sendHtmlMail({ to: input.to, subject, html, text });
}

export async function sendBalanceReminderEmail(input: {
  to: string;
  name: string;
  houseName: string;
  amountOwed: number;
}): Promise<void> {
  if (!hasEmailConfig()) return;
  const appUrl = `${appBaseUrl()}/dashboard`;
  const subject = `Reminder: pending settlement in ${input.houseName}`;
  const html = renderAppEmail({
    title: "Quick balance reminder",
    greeting: `Hi ${input.name},`,
    lead: `You currently owe ₹${input.amountOwed.toLocaleString("en-IN")} in ${input.houseName}.`,
    bullets: ["Open dashboard to see who to settle", "Use Mark as Settled after transfer"],
    ctaLabel: "Open Dashboard",
    ctaHref: appUrl,
  });
  const text = `Hi ${input.name}, you currently owe ₹${input.amountOwed.toLocaleString("en-IN")} in ${input.houseName}. Open dashboard: ${appUrl}`;
  await sendHtmlMail({ to: input.to, subject, html, text });
}

export async function sendMonthlySummaryEmail(input: {
  to: string;
  name: string;
  houseName: string;
  monthLabel: string;
  totalExpenses: number;
  topSpender: string;
  remainingBalance: number | null;
}): Promise<void> {
  if (!hasEmailConfig()) return;
  const appUrl = `${appBaseUrl()}/dashboard`;
  const subject = `${input.monthLabel} summary — ${input.houseName}`;
  const remaining =
    input.remainingBalance == null
      ? "No monthly budget configured"
      : `₹${input.remainingBalance.toLocaleString("en-IN")} remaining`;
  const html = renderAppEmail({
    title: `${input.monthLabel} monthly summary`,
    greeting: `Hi ${input.name},`,
    lead: `Here is your house snapshot for ${input.monthLabel}.`,
    bullets: [
      `Total expenses: ₹${input.totalExpenses.toLocaleString("en-IN")}`,
      `Top spender: ${input.topSpender}`,
      `Balance: ${remaining}`,
    ],
    ctaLabel: "View Dashboard",
    ctaHref: appUrl,
  });
  const text = `${input.monthLabel} summary:
- Total expenses: ₹${input.totalExpenses.toLocaleString("en-IN")}
- Top spender: ${input.topSpender}
- Balance: ${remaining}
Open dashboard: ${appUrl}`;
  await sendHtmlMail({ to: input.to, subject, html, text });
}
