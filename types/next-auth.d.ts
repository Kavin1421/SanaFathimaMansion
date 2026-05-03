import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      onboardingCompleted: boolean;
      role: "admin" | "user";
      ledgerUserId?: string | null;
      /** True when signed-in account email matches SUPER_ADMIN_EMAIL (server-computed). */
      isSuperAdmin: boolean;
    };
  }

  interface User {
    id: string;
    email?: string;
    onboardingCompleted?: boolean;
    role?: "admin" | "user";
    ledgerUserId?: string | null;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingCompleted: boolean;
    role?: "admin" | "user";
    ledgerUserId?: string | null;
    email?: string;
    isSuperAdmin?: boolean;
  }
}
