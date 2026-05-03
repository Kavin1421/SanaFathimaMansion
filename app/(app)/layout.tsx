import { AppShell } from "@/components/layout/app-shell";
import { getHouseDisplayName } from "@/lib/house-name";
import type { ReactNode } from "react";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const houseName = await getHouseDisplayName();
  return <AppShell houseName={houseName}>{children}</AppShell>;
}
