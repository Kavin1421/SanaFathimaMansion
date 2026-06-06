import { connectDb } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { PreBill } from "@/models/PreBill";
import { Settlement } from "@/models/Settlement";
import { User } from "@/models/User";

export type ActivityItem = {
  id: string;
  type: "expense" | "settlement" | "pre_bill";
  title: string;
  subtitle?: string;
  amount?: number;
  actorName?: string;
  createdAt: string;
};

export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  await connectDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [expenses, settlements, preBills, users] = await Promise.all([
    Expense.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title amount category paidBy createdAt")
      .lean(),
    Settlement.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("fromUser toUser amount status createdAt")
      .lean(),
    PreBill.find({ updatedAt: { $gte: since }, status: "finalized" })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("title category createdBy updatedAt status")
      .lean(),
    User.find().select("name").lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));
  const items: ActivityItem[] = [];

  for (const e of expenses) {
    items.push({
      id: `expense-${e._id.toString()}`,
      type: "expense",
      title: e.title,
      subtitle: e.category,
      amount: e.amount,
      actorName: userMap.get(e.paidBy.toString()) ?? "Someone",
      createdAt: ((e as { createdAt?: Date }).createdAt ?? e.date).toISOString(),
    });
  }

  for (const s of settlements) {
    const from = userMap.get(s.fromUser.toString()) ?? "?";
    const to = userMap.get(s.toUser.toString()) ?? "?";
    items.push({
      id: `settlement-${s._id.toString()}`,
      type: "settlement",
      title: `${from} → ${to}`,
      subtitle: s.status === "completed" ? "Settlement recorded" : `Settlement ${s.status}`,
      amount: s.amount,
      createdAt: ((s as { createdAt?: Date }).createdAt ?? s.date).toISOString(),
    });
  }

  for (const p of preBills) {
    items.push({
      id: `prebill-${p._id.toString()}`,
      type: "pre_bill",
      title: p.title,
      subtitle: "Pre-bill finalized",
      actorName: userMap.get(p.createdBy.toString()) ?? "Someone",
      createdAt: p.updatedAt.toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}
