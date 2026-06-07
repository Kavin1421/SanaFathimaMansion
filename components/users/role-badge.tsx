import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/roles";
import { Crown, Shield } from "lucide-react";

export function RoleBadge({
  role,
  isSuperAdmin,
  className,
}: {
  role?: "admin" | "user";
  isSuperAdmin?: boolean;
  className?: string;
}) {
  const label = roleLabel({ role, isSuperAdmin }, isSuperAdmin);

  if (isSuperAdmin) {
    return (
      <Badge variant="default" className={className}>
        <Crown className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  }

  if (role === "admin") {
    return (
      <Badge variant="secondary" className={className}>
        <Shield className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
