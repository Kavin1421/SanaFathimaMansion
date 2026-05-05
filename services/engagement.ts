import { addDays } from "date-fns";
import { getHouseDisplayName } from "@/lib/house-name";
import { notifyWhatsAppText } from "@/lib/whatsapp-notify";
import { monthKeyFromDate } from "@/lib/dates";
import { connectDb } from "@/lib/db";
import { sendBalanceReminderEmail, sendMonthlySummaryEmail } from "@/lib/email";
import { User } from "@/models/User";
import { getMonthlySummary } from "@/services/aggregations";

export async function runDailyBalanceReminders(now = new Date()): Promise<{ reminded: number }> {
  await connectDb();
  const houseName = await getHouseDisplayName();
  const users = await User.find({ status: { $in: ["invited", "active"] } }).lean();
  const owing = users.filter((u) => u.balance < -0.01);

  let reminded = 0;
  for (const u of owing) {
    const amount = Math.abs(u.balance);
    await sendBalanceReminderEmail({
      to: u.email,
      name: u.name,
      houseName,
      amountOwed: amount,
    });
    reminded += 1;
    await User.updateOne({ _id: u._id }, { $set: { lastReminderAt: now } });
  }

  if (owing.length > 0) {
    const lines = owing.map((u) => `• ${u.name} owes ₹${Math.abs(u.balance).toLocaleString("en-IN")}`);
    notifyWhatsAppText(
      `📌 Daily balance reminder\n${lines.join("\n")}\n\nPlease settle and mark as settled in app.`,
    );
  }

  return { reminded };
}

export async function runMonthlySummaryBroadcast(now = new Date()): Promise<{ sent: number; monthKey: string }> {
  const nextDay = addDays(now, 1);
  if (nextDay.getMonth() === now.getMonth()) {
    return { sent: 0, monthKey: monthKeyFromDate(now) };
  }

  const monthKey = monthKeyFromDate(now);
  const houseName = await getHouseDisplayName();
  const summary = await getMonthlySummary(monthKey);
  const users = await User.find({ status: { $in: ["invited", "active"] } }).lean();

  let sent = 0;
  for (const u of users) {
    await sendMonthlySummaryEmail({
      to: u.email,
      name: u.name,
      houseName,
      monthLabel: summary.monthLabel,
      totalExpenses: summary.totalSpent,
      topSpender: summary.monthlyWinner?.name ?? "No top spender",
      remainingBalance: summary.monthRemaining,
    });
    sent += 1;
  }

  notifyWhatsAppText(
    `📊 ${summary.monthLabel} summary\nTotal: ₹${summary.totalSpent.toLocaleString("en-IN")}\nTop spender: ${summary.monthlyWinner?.name ?? "N/A"}\nRemaining balance: ${summary.monthRemaining == null ? "N/A" : `₹${summary.monthRemaining.toLocaleString("en-IN")}`}`,
  );

  return { sent, monthKey };
}
