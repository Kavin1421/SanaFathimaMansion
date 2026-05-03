"use client";

import type { ExpenseCategory } from "@/lib/constants";
import { formatInr } from "@/lib/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/** Soft pastel palette — easy on the eyes in light and dark */
const PASTEL = ["#d8b4fe", "#86efac", "#fdba74", "#fde68a", "#7dd3fc"];

type Row = { category: ExpenseCategory; total: number; emoji: string };

type Props = { data: Row[] };

export function CategoryDonut({ data }: Props) {
  const chart = data.filter((d) => d.total > 0);
  const total = chart.reduce((s, d) => s + d.total, 0);

  if (chart.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200/80 text-sm text-muted-foreground dark:border-slate-800">
        No spending this month
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={3}
              cornerRadius={4}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              isAnimationActive
              animationDuration={800}
            >
              {chart.map((_, i) => (
                <Cell key={i} fill={PASTEL[i % PASTEL.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _n, item) => {
                const payload = item?.payload as Row | undefined;
                const label = payload ? `${payload.emoji} ${payload.category}` : "";
                return [formatInr(value as number), label];
              }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                boxShadow: "0 12px 40px -12px rgb(0 0 0 / 0.18)",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
          {formatInr(total)}
        </span>
      </div>
    </div>
  );
}
