"use client";

import { PremiumEmptyState } from "@/components/lottie/premium-empty-state";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/icons/category-icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr } from "@/lib/utils";
import type { RecentExpenseRow } from "@/types";

export function DashboardRecentTable({ rows }: { rows: RecentExpenseRow[] }) {
  if (rows.length === 0) {
    return (
      <PremiumEmptyState
        scene="emptyInbox"
        title="No expenses this month"
        description="Your latest household spend will show up here."
        compact
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paid by</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Date</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => (
            <TableRow key={e._id}>
              <TableCell className="whitespace-nowrap font-medium">{e.paidByName}</TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  <CategoryIcon category={e.category} className="h-4 w-4 text-muted-foreground" />
                  {e.category}
                </span>
              </TableCell>
              <TableCell className="max-w-[220px] truncate text-muted-foreground">{e.title}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatInr(e.amount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                {new Date(e.date).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="rounded-md">
                  Recorded
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
