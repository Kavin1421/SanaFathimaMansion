import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { Account } from "@/models/Account";

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
          });
        } else {
          if (!acc.googleId) acc.googleId = account.providerAccountId;
          if (user.image && !acc.image) acc.image = user.image;
          await acc.save();
        }
        token.id = acc._id.toString();
        token.onboardingCompleted = acc.onboardingCompleted;
      }

      if (token.id) {
        await connectDb();
        const acc = await Account.findById(token.id).select("onboardingCompleted").lean();
        if (acc) token.onboardingCompleted = Boolean(acc.onboardingCompleted);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.onboardingCompleted = Boolean(token.onboardingCompleted);
      }
      return session;
    },
  },
};
