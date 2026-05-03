import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { Session } from "next-auth";

export async function requireAuthSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}
