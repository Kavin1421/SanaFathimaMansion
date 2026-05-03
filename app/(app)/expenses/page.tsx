import { ExpensesPageClient } from "@/components/expenses/expenses-page-client";
import { monthKeyFromDate } from "@/lib/dates";

type Props = { searchParams: { month?: string } };

export default function ExpensesPage({ searchParams }: Props) {
  const monthKey =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : monthKeyFromDate(new Date());

  return <ExpensesPageClient monthKey={monthKey} />;
}
