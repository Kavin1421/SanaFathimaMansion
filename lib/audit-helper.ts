import type { Session } from "next-auth";
import type { AuditPerformedBy } from "@/models/AuditLog";

export function performerFromSession(session: Session): AuditPerformedBy {
  return {
    accountId: session.user.id,
    email: session.user.email?.toLowerCase().trim() ?? "",
    name: session.user.name ?? "",
  };
}

export function performerAnonymous(name = "Anonymous"): AuditPerformedBy {
  return {
    accountId: "anonymous",
    email: "",
    name,
  };
}

export function toAuditJson(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
