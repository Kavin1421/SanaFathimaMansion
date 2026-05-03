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
      <SelectTrigger className="h-11 min-w-0 max-w-[11rem] flex-1 rounded-xl border bg-background/80 shadow-sm sm:max-w-[13rem] sm:flex-initial md:h-10 md:w-[200px] md:max-w-none">
        <CalendarDays className="mr-1 h-4 w-4 shrink-0 text-muted-foreground sm:mr-2" />
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
