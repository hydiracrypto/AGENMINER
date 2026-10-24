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
  title: "AGENTIC MINER — Mine AGENMINER with AI Prompts on BNB Chain",
  description:
    "AGENTIC MINER (AGENMINER) mining game on BNB Smart Chain mainnet — 100M fixed supply. Sign in with Binance Agentic Wallet, mine tokens with AI prompts, upgrade your rig, invite friends, withdraw with NO minimum. | Game mining AGENMINER di BNB Smart Chain — masuk dengan Binance Agentic Wallet, tambang via prompt AI, penarikan tanpa minimal.",
  keywords: [
    "AGENTIC MINER",
    "AGENMINER",
    "BNB Chain",
    "Binance Agentic Wallet",
    "mining game",
    "tap to earn",
    "AI mining",
    "BEP-20",
    "no minimum withdrawal",
    "crypto countries",
  ],
  openGraph: {
    title: "AGENTIC MINER ⛏️ — AI Prompt Mining on BNB Chain",
    description:
      "Mine AGENMINER tokens with AI prompts on BNB Smart Chain — sign in with Binance Agentic Wallet. No minimum withdrawal!",
    type: "website",
    images: ["/logo.png"],
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
