import { addMonths, format, parse } from "date-fns";

export function monthKeyFromDate(d: Date): string {
  return format(d, "yyyy-MM");
}

export function parseMonthKey(monthKey: string): Date {
  return parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
}

/** [start, end) interval for the month in local timezone */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  const start = parseMonthKey(monthKey);
  const end = addMonths(start, 1);
  return { start, end };
}

export function previousMonthKey(monthKey: string): string {
  const start = parseMonthKey(monthKey);
  return monthKeyFromDate(addMonths(start, -1));
}
