export type PermissionItem = {
  label: string;
  allowed: boolean;
};

const memberPermissions: PermissionItem[] = [
  { label: "Log expenses and custom splits", allowed: true },
  { label: "Edit or delete your own expenses", allowed: true },
  { label: "Settle balances you are part of", allowed: true },
  { label: "Create and manage your pre-bills", allowed: true },
  { label: "Reminder preferences on this profile", allowed: true },
  { label: "Invite or edit household members", allowed: false },
  { label: "Delete anyone else's expenses", allowed: false },
  { label: "Monthly wallet amend and month rollover", allowed: false },
  { label: "Change Admin / Member roles", allowed: false },
  { label: "Audit logs and platform settings", allowed: false },
];

const adminPermissions: PermissionItem[] = [
  { label: "Everything a Member can do", allowed: true },
  { label: "Invite, edit, and remove roommates", allowed: true },
  { label: "Delete any household expense", allowed: true },
  { label: "Amend monthly wallet and start a new month", allowed: true },
  { label: "Moderate all pre-bills", allowed: true },
  { label: "Settle balances on behalf of others", allowed: true },
  { label: "Change Admin / Member roles", allowed: false },
  { label: "Audit logs and notification events", allowed: false },
  { label: "API documentation (platform owner)", allowed: false },
];

export function permissionsForRole(role: "admin" | "user"): PermissionItem[] {
  return role === "admin" ? adminPermissions : memberPermissions;
}

export function permissionsSummary(role: "admin" | "user"): string {
  if (role === "admin") {
    return "You have household management access. Role changes and platform tools stay with the Super Admin.";
  }
  return "Standard household access. Ask the Super Admin on the Users page if you need admin privileges.";
}
