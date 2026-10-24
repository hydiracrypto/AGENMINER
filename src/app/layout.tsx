import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGENTIC MINER — Tambang AGENMINER dengan Prompt AI di BNB Chain",
  description:
    "Game mining token AGENMINER (100 juta suplai) di BNB Smart Chain. Masuk dengan Binance Agentic Wallet, tambang token lewat prompt AI, upgrade rig, ajak teman, dan tarik reward ke wallet kamu.",
  keywords: [
    "AGENTIC MINER",
    "AGENMINER",
    "BNB Chain",
    "Binance Agentic Wallet",
    "mining game",
    "tap to earn",
    "AI mining",
    "BEP-20",
  ],
  openGraph: {
    title: "AGENTIC MINER ⛏️",
    description: "Tambang token AGENMINER via Prompt AI di BNB Smart Chain — masuk dengan Binance Agentic Wallet!",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B0E11",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0E11] text-[#EAECEF]`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
