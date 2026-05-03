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
    };
  }

  interface User {
    id: string;
    onboardingCompleted?: boolean;
    role?: "admin" | "user";
    ledgerUserId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    onboardingCompleted: boolean;
    role?: "admin" | "user";
    ledgerUserId?: string | null;
  }
}
