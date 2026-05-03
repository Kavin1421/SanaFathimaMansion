"use client";

import { addMonths, format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { parseMonthKey } from "@/lib/dates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string;
  onChange: (monthKey: string) => void;
};

export function MonthSelect({ value, onChange }: Props) {
  const center = parseMonthKey(value);
  const options: string[] = [];
  for (let i = -6; i <= 3; i++) {
    options.push(format(addMonths(center, i), "yyyy-MM"));
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-[200px] rounded-xl border bg-background/80 shadow-sm">
        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Month" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {options.map((k) => (
          <SelectItem key={k} value={k}>
            {format(parseMonthKey(k), "MMMM yyyy")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
