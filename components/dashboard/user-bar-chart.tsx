"use client";

import { PremiumEmptyState } from "@/components/lottie/premium-empty-state";
import { formatInr } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { name: string; paid: number };

export function UserBarChart({ data }: { data: Row[] }) {
  if (!data.some((d) => d.paid > 0)) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800">
        <PremiumEmptyState
          scene="emptyChart"
          title="No payments recorded"
          description="Who paid what will show here this month."
          compact
        />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="4 8"
          stroke="hsl(var(--border))"
          strokeOpacity={0.35}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip
          formatter={(value: number) => formatInr(value)}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            boxShadow: "0 12px 40px -12px rgb(0 0 0 / 0.15)",
          }}
        />
        <Bar
          dataKey="paid"
          fill="hsl(var(--primary))"
          radius={[8, 8, 0, 0]}
          maxBarSize={48}
          isAnimationActive
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
