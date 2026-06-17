"use client";

import { PremiumEmptyState } from "@/components/lottie/premium-empty-state";
import { formatInr } from "@/lib/utils";
import type { DailySpendPoint } from "@/types";
import { format, parseISO } from "date-fns";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = DailySpendPoint & { label: string };

function SpendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row; value: number; name: string; color: string }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-muted-foreground">
        {format(parseISO(row.date), "EEE, d MMM")}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums">{formatInr(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpendChart({ data }: { data: DailySpendPoint[] }) {
  const gradId = useId().replace(/:/g, "");
  const chart: Row[] = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "d MMM"),
  }));

  if (chart.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800">
        <PremiumEmptyState
          scene="emptyChart"
          title="No spend data yet"
          description="Daily trends show up after your first expense."
          compact
        />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chart} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
            <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 8"
          stroke="hsl(var(--border))"
          strokeOpacity={0.35}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
          width={44}
        />
        <Tooltip content={<SpendTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
        <Legend
          wrapperStyle={{ paddingTop: 16 }}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
        <Area
          type="natural"
          dataKey="cumulative"
          name="This month"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          fill={`url(#${gradId})`}
          activeDot={{ r: 5, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={900}
        />
        <Area
          type="natural"
          dataKey="priorMonthCumulative"
          name="Prior month (pace)"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeOpacity={0.85}
          strokeDasharray="6 5"
          fill="none"
          isAnimationActive
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
