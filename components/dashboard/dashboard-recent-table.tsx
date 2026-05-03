"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORY_META } from "@/lib/constants";
import { formatInr } from "@/lib/utils";
import type { RecentExpenseRow } from "@/types";

export function DashboardRecentTable({ rows }: { rows: RecentExpenseRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No expenses recorded this month yet.</p>
    );
  }

  return (
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
            <TableCell className="font-medium">{e.paidByName}</TableCell>
            <TableCell>
              {CATEGORY_META[e.category].emoji} {e.category}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-muted-foreground">{e.title}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatInr(e.amount)}</TableCell>
            <TableCell className="text-right text-muted-foreground">
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
  );
}
