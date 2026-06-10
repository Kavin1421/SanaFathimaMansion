import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { isSecureAuthCookies, SESSION_MAX_AGE_SEC } from "@/lib/auth-env";
import { connectDb } from "@/lib/db";
import { Account } from "@/models/Account";
import { User } from "@/models/User";
import { superAdminEmail } from "@/lib/super-admin";

const JWT_DB_REFRESH_MS = 5 * 60 * 1000;

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.length) && Boolean(process.env.GOOGLE_CLIENT_SECRET?.length);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDb();
        const acc = await Account.findOne({ email: String(credentials.email).toLowerCase() });
        if (!acc?.passwordHash) return null;
        const ok = await bcrypt.compare(String(credentials.password), acc.passwordHash);
        if (!ok) return null;
        return {
          id: acc._id.toString(),
          email: acc.email,
          name: acc.name,
          image: acc.image,
          onboardingCompleted: acc.onboardingCompleted,
          role: acc.role ?? "user",
          ledgerUserId: acc.ledgerUserId?.toString() ?? null,
        };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isSecureAuthCookies()
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureAuthCookies(),
        maxAge: SESSION_MAX_AGE_SEC,
      },
    },
  },
  useSecureCookies: isSecureAuthCookies(),
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session) {
        const patch = session as { name?: string; image?: string | null; role?: "admin" | "user" };
        if (typeof patch.name === "string") token.name = patch.name;
        if ("image" in patch) token.picture = patch.image ?? undefined;
        if (patch.role === "admin" || patch.role === "user") token.role = patch.role;
      }

      if (user && account?.provider === "credentials") {
        token.id = user.id;
        token.sub = user.id;
        token.name = user.name ?? token.name;
        token.picture = user.image ?? undefined;
        token.onboardingCompleted = Boolean(
          (user as { onboardingCompleted?: boolean }).onboardingCompleted,
        );
        token.role = (user as { role?: "admin" | "user" }).role ?? "user";
        token.ledgerUserId = (user as { ledgerUserId?: string | null }).ledgerUserId ?? null;
        const em = String((user as { email?: string }).email ?? "").toLowerCase().trim();
        token.email = em;
        token.isSuperAdmin = em === superAdminEmail();
      }

      if (user && account?.provider === "google" && user.email) {
        await connectDb();
        const email = user.email.toLowerCase();
        let acc = await Account.findOne({ email });
        if (!acc) {
          const invited = await User.findOne({ email }).select("_id").lean();
          acc = await Account.create({
            email,
            name: user.name ?? email.split("@")[0],
            image: user.image ?? undefined,
            googleId: account.providerAccountId,
            onboardingCompleted: false,
            role: "user",
            ...(invited?._id ? { ledgerUserId: invited._id } : {}),
          });
        } else {
          if (!acc.googleId) acc.googleId = account.providerAccountId;
          if (user.image && !acc.image) acc.image = user.image;
          await acc.save();
        }
        token.id = acc._id.toString();
        token.sub = acc._id.toString();
        token.name = acc.name;
        token.picture = acc.image ?? undefined;
        token.onboardingCompleted = acc.onboardingCompleted;
        token.role = acc.role ?? "user";
        token.ledgerUserId = acc.ledgerUserId?.toString() ?? null;
        token.email = acc.email.toLowerCase().trim();
        token.isSuperAdmin = token.email === superAdminEmail();
      }

      // Refresh profile from DB periodically — never throw (DB blips must not log users out).
      if (token.id && !user) {
        const lastRefresh = (token.dbRefreshedAt as number | undefined) ?? 0;
        const now = Date.now();
        if (now - lastRefresh >= JWT_DB_REFRESH_MS) {
          try {
            await connectDb();
            const acc = await Account.findById(token.id)
              .select("onboardingCompleted role ledgerUserId email name image")
              .lean();
            if (acc) {
              token.onboardingCompleted = Boolean(acc.onboardingCompleted);
              token.role = acc.role ?? "user";
              token.ledgerUserId = acc.ledgerUserId?.toString() ?? null;
              token.name = acc.name;
              token.picture = acc.image ?? undefined;
              if (acc.email) {
                token.email = acc.email.toLowerCase().trim();
                token.isSuperAdmin = token.email === superAdminEmail();
              }
            }
            token.dbRefreshedAt = now;
          } catch (e) {
            console.error("[auth] jwt db refresh failed — keeping existing session", e);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string | undefined) ?? session.user.name ?? "";
        session.user.image = (token.picture as string | undefined) ?? null;
        session.user.onboardingCompleted = Boolean(token.onboardingCompleted);
        session.user.role = (token.role as "admin" | "user") ?? "user";
        session.user.ledgerUserId = (token.ledgerUserId as string | undefined) ?? null;
        session.user.email =
          (typeof token.email === "string" && token.email) ||
          session.user.email ||
          "";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        const email = (user as { email?: string }).email?.toLowerCase().trim();
        if (email) {
          await connectDb();
          const invited = await User.findOneAndUpdate(
            { email },
            { $set: { status: "active", activatedAt: new Date() } },
            { new: true },
          ).lean();
          if (invited && user.id) {
            await Account.findByIdAndUpdate(user.id, {
              $set: { ledgerUserId: invited._id },
            });
          }
        }
        const performedBy = {
          accountId: user.id ?? "",
          email: (user as { email?: string }).email?.toLowerCase().trim() ?? "",
          name: user.name ?? "",
        };
        void import("@/services/audit-log")
          .then(({ appendAuditLog }) =>
            appendAuditLog({
              actionType: "LOGIN",
              performedBy,
              targetEntity: { type: "session", label: "signIn" },
            }),
          )
          .catch((e) => console.error("[audit] signIn log failed", e));
      } catch (e) {
        console.error("[signIn] user activation failed", e);
      }
    },
  },
};
