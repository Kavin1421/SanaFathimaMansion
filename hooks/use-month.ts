"use client";

import { monthKeyFromDate } from "@/lib/dates";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useMonthParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthKey = useMemo(() => {
    const m = searchParams.get("month");
    if (m && /^\d{4}-\d{2}$/.test(m)) return m;
    return monthKeyFromDate(new Date());
  }, [searchParams]);

  const setMonthKey = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", key);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { monthKey, setMonthKey };
}
