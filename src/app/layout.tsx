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
  title: "AGENTIC MINER — 用 AI 提示词在 BNB Chain 挖矿 | Mine AGENMINER with AI Prompts",
  description:
    "AGENTIC MINER (AGENMINER) 挖矿游戏 — BNB Smart Chain 主网，固定供应 1 亿枚。使用 Binance Agentic Wallet 登录，AI 提示词挖矿，提现无最低限额，手续费自动注入 PancakeSwap 流动性。 | AGENMINER mining game on BNB Smart Chain mainnet — sign in with Binance Agentic Wallet, mine with AI prompts, no minimum withdrawal, fees auto-added to PancakeSwap liquidity.",
  keywords: [
    "AGENTIC MINER",
    "AGENMINER",
    "BNB Chain",
    "Binance Agentic Wallet",
    "mining game",
    "AI mining",
    "AI 挖矿",
    "BEP-20",
    "PancakeSwap",
    "no minimum withdrawal",
    "crypto countries",
  ],
  // ⚠️ @binance/w3w SDK membaca nama dApp dari <meta name="name"> dulu (getClientMetadata),
  // lalu og:site_name / og:title. Tanpa ini, wallet Binance menampilkan title panjang
  // sebagai nama dApp saat approve (pengguna melihat nama yang salah).
  other: {
    name: "Agentic Miner",
  },
  openGraph: {
    title: "AGENTIC MINER ⛏️ — AI Prompt Mining on BNB Chain",
    siteName: "Agentic Miner",
    description:
      "Mine AGENMINER tokens with AI prompts on BNB Smart Chain — sign in with Binance Agentic Wallet. No minimum withdrawal, fees go to PancakeSwap liquidity!",
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
    <html lang="zh" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0E11] text-[#EAECEF]`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
