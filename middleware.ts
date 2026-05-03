import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const pagePrefixes = ["/dashboard", "/expenses", "/users", "/reports", "/onboarding", "/audit-logs"];

function isProtectedPage(path: string) {
  return pagePrefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function isProtectedApi(path: string) {
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/auth")) return false;
  return (
    path.startsWith("/api/dashboard") ||
    path.startsWith("/api/expenses") ||
    path.startsWith("/api/users") ||
    path.startsWith("/api/upload") ||
    path.startsWith("/api/report") ||
    path.startsWith("/api/house") ||
    path.startsWith("/api/onboarding") ||
    path.startsWith("/api/audit-logs")
  );
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (isProtectedPage(path) || isProtectedApi(path)) {
      console.error("NEXTAUTH_SECRET is not set");
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });
  const userId = token?.id as string | undefined;
  const onboardingDone = Boolean(token?.onboardingCompleted);

  if (isProtectedApi(path)) {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isProtectedPage(path)) {
    return NextResponse.next();
  }

  if (!userId) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if (!onboardingDone && path !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (onboardingDone && path === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/expenses",
    "/expenses/:path*",
    "/users",
    "/users/:path*",
    "/reports",
    "/reports/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/audit-logs",
    "/audit-logs/:path*",
    "/api/dashboard",
    "/api/dashboard/:path*",
    "/api/expenses",
    "/api/expenses/:path*",
    "/api/users",
    "/api/users/:path*",
    "/api/upload",
    "/api/upload/:path*",
    "/api/report",
    "/api/report/:path*",
    "/api/house",
    "/api/house/:path*",
    "/api/onboarding",
    "/api/onboarding/:path*",
    "/api/audit-logs",
    "/api/audit-logs/:path*",
  ],
};
