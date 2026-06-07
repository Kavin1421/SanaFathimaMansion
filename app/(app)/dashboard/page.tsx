import { DashboardView } from "@/components/dashboard/dashboard-view";
import { monthKeyFromDate } from "@/lib/dates";

type Props = { searchParams: { month?: string; amendWallet?: string } };

export default function DashboardPage({ searchParams }: Props) {
  const monthKey =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : monthKeyFromDate(new Date());

  return <DashboardView monthKey={monthKey} amendWallet={searchParams.amendWallet} />;
}
