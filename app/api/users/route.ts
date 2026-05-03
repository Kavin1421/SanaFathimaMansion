import { NextResponse } from "next/server";
import { listUsers } from "@/services/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
