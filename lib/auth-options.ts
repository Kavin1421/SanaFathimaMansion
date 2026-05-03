import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { Account } from "@/models/Account";
import { superAdminEmail } from "@/lib/super-admin";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.length) && Boolean(process.env.GOOGLE_CLIENT_SECRET?.length);

export const authOptions: NextAuthOptions = {
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
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account?.provider === "credentials") {
        token.id = user.id;
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
          acc = await Account.create({
            email,
            name: user.name ?? email.split("@")[0],
            image: user.image ?? undefined,
            googleId: account.providerAccountId,
            onboardingCompleted: false,
            role: "user",
          });
        } else {
          if (!acc.googleId) acc.googleId = account.providerAccountId;
          if (user.image && !acc.image) acc.image = user.image;
          await acc.save();
        }
        token.id = acc._id.toString();
        token.onboardingCompleted = acc.onboardingCompleted;
        token.role = acc.role ?? "user";
        token.ledgerUserId = acc.ledgerUserId?.toString() ?? null;
        token.email = acc.email.toLowerCase().trim();
        token.isSuperAdmin = token.email === superAdminEmail();
      }

      if (token.id) {
        await connectDb();
        const acc = await Account.findById(token.id)
          .select("onboardingCompleted role ledgerUserId email")
          .lean();
        if (acc) {
          token.onboardingCompleted = Boolean(acc.onboardingCompleted);
          token.role = acc.role ?? "user";
          token.ledgerUserId = acc.ledgerUserId?.toString() ?? null;
          if (acc.email) {
            token.email = acc.email.toLowerCase().trim();
            token.isSuperAdmin = token.email === superAdminEmail();
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
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
        const { appendAuditLog } = await import("@/services/audit-log");
        await appendAuditLog({
          actionType: "LOGIN",
          performedBy: {
            accountId: user.id ?? "",
            email: (user as { email?: string }).email?.toLowerCase().trim() ?? "",
            name: user.name ?? "",
          },
          targetEntity: { type: "session", label: "signIn" },
        });
      } catch (e) {
        console.error("[audit] signIn log failed", e);
      }
    },
  },
};
