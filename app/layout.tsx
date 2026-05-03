import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "SanaFathima Mansion — Expenses",
    template: "%s · SanaFathima Mansion",
  },
  description: "Shared expense tracking for roommates",
  applicationName: "SanaFathima Mansion",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SFM Expenses",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen min-h-[100dvh] touch-manipulation font-sans`}
      >
        <Providers>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
