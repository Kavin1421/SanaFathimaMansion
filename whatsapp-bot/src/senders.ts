import wweb from "whatsapp-web.js";

type Chat = wweb.Chat;

export type ExpenseAlertPayload = {
  name: string;
  amount: string | number;
  category: string;
  splitCount: number;
};

export type WalletPayload = {
  name: string;
  amount: string | number;
};

export type BillImagePayload = {
  imageUrl: string;
  caption: string;
};

function formatAmount(amount: string | number): string {
  return typeof amount === "number" ? String(amount) : amount;
}

export function formatExpenseMessage(data: ExpenseAlertPayload): string {
  const amt = formatAmount(data.amount);
  return `🚨 Expense Alert!
${data.name} paid ₹${amt} for ${data.category}
Split between ${data.splitCount} members`;
}

export function formatWalletMessage(data: WalletPayload): string {
  const amt = formatAmount(data.amount);
  return `🎉 ${data.name} added ₹${amt} to wallet`;
}

export async function sendExpenseMessage(chat: Chat, data: ExpenseAlertPayload): Promise<void> {
  await chat.sendMessage(formatExpenseMessage(data));
}

export async function sendWalletMessage(chat: Chat, data: WalletPayload): Promise<void> {
  await chat.sendMessage(formatWalletMessage(data));
}

export async function sendBillImage(chat: Chat, data: BillImagePayload): Promise<void> {
  const media = await wweb.MessageMedia.fromUrl(data.imageUrl, { unsafeMime: true });
  await chat.sendMessage(media, { caption: data.caption });
}
