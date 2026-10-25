"use client";

import { Coins, Flame, Zap } from "lucide-react";
import { TOKEN, fmtNum, truncateAddress } from "@/lib/game-config";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import LanguageToggle from "@/components/game/language-toggle";

export default function GameHeader() {
  const user = useGameStore((s) => s.user);
  const setTab = useGameStore((s) => s.setTab);
  const { t, lang } = useT();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-[#2B3139]/80 bg-[#0B0E11]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-md px-4 py-3 md:max-w-2xl md:px-6 lg:max-w-6xl lg:px-8">
        <div className="flex items-center gap-2">
          {/* Profil — klik → buka tab Wallet (TIDAK memicu sign/connect lagi) */}
          <button
            onClick={() => setTab("wallet")}
            className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            aria-label="Buka dompet saya"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2B3139] to-[#181A20] border border-[#2B3139] text-xl">
              {user.avatar}
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-bold truncate max-w-[110px]">{user.username}</span>
              <span className="block text-[11px] text-[#848E9C] font-mono">{truncateAddress(user.walletAddress)}</span>
            </span>
          </button>

          <div className="flex-1" />

          {/* Streak */}
          <div className="flex items-center gap-1 rounded-full bg-[#1E2329] px-2.5 py-1.5" title={t("dailyStreak")}>
            <Flame className="h-3.5 w-3.5 text-[#F6465D]" />
            <span className="text-xs font-bold">{user.streak}</span>
          </div>

          {/* Power */}
          <div
            className="flex items-center gap-1 rounded-full bg-[#1E2329] px-2.5 py-1.5"
            title={t("powerMult")}
          >
            <Zap className="h-3.5 w-3.5 text-[#F0B90B]" />
            <span className="text-xs font-bold">x{user.miningPower}</span>
          </div>

          {/* Toggle bahasa 中文 ⇄ EN */}
          <LanguageToggle variant="compact" />
        </div>

        {/* Saldo */}
        <div className="pb-3 pt-3">
          <div className="am-card rounded-2xl bg-gradient-to-r from-[#F0B90B]/15 via-[#181A20] to-[#A855F7]/10 border border-[#F0B90B]/25 px-4 py-3 flex items-center justify-between lg:max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#F8D33A] to-[#F0B90B] text-[#0B0E11] shadow-[0_0_18px_rgba(240,185,11,0.35)]">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#848E9C]">{t("balance", { sym: TOKEN.symbol })}</p>
                <p className="text-lg font-extrabold leading-none tabular-nums">{fmtNum(user.balance, 2, lang)}</p>
              </div>
            </div>
            <span className="rounded-full bg-[#0B0E11] px-2.5 py-1 text-[10px] font-semibold text-[#F0B90B] border border-[#F0B90B]/30">
              {TOKEN.chainShort} Mainnet
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
