"use client";

// ============================================
// AGENTIC MINER — Sidebar navigasi DESKTOP (lg+)
// Logo, menu tab, statistik token mini, toggle bahasa
// Mobile tetap memakai BottomNav (sidebar disembunyikan di bawah lg)
// ============================================

import Image from "next/image";
import { Pickaxe, Zap, Users, Trophy, Wallet, Globe2 } from "lucide-react";
import { TOKEN, PANCAKESWAP, fmtNum } from "@/lib/game-config";
import { useGameStore, type GameTab } from "@/lib/store";
import { useT } from "@/lib/i18n";
import LanguageToggle from "@/components/game/language-toggle";

const ICONS: Record<GameTab, React.ReactNode> = {
  mine: <Pickaxe className="h-[18px] w-[18px]" />,
  boost: <Zap className="h-[18px] w-[18px]" />,
  friends: <Users className="h-[18px] w-[18px]" />,
  rank: <Trophy className="h-[18px] w-[18px]" />,
  wallet: <Wallet className="h-[18px] w-[18px]" />,
};

export default function SidebarNav() {
  const tab = useGameStore((s) => s.tab);
  const setTab = useGameStore((s) => s.setTab);
  const { t } = useT();

  const TABS: { id: GameTab; label: string }[] = [
    { id: "mine", label: t("navMine") },
    { id: "boost", label: t("navBoost") },
    { id: "friends", label: t("navFriends") },
    { id: "rank", label: t("navRank") },
    { id: "wallet", label: t("navWallet") },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-[#2B3139]/80 bg-[#0D1013]/95 backdrop-blur-xl lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F0B90B]/50 bg-[#0B0E11] shadow-[0_0_24px_rgba(240,185,11,0.25)]">
          <Image src="/logo.png" alt="AGENTIC MINER logo" width={44} height={44} className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight">
            AGENTIC <span className="text-[#F0B90B]">MINER</span>
          </p>
          <p className="flex items-center gap-1 text-[10px] font-semibold text-[#848E9C]">
            <Globe2 className="h-3 w-3 text-[#20B26C]" /> {TOKEN.chainShort} Mainnet
          </p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3" aria-label="Main navigation">
        <ul className="space-y-1">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#F0B90B]/15 to-transparent text-[#F0B90B]"
                      : "text-[#848E9C] hover:bg-[#161A1E] hover:text-[#EAECEF]"
                  }`}
                >
                  {/* indikator aktif */}
                  <span
                    className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#F0B90B] transition-opacity ${
                      active ? "opacity-100 shadow-[0_0_10px_rgba(240,185,11,0.8)]" : "opacity-0"
                    }`}
                  />
                  <span className={active ? "drop-shadow-[0_0_8px_rgba(240,185,11,0.5)]" : ""}>{ICONS[item.id]}</span>
                  {item.label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F0B90B]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Statistik token mini */}
      <div className="mx-3 mb-3 rounded-2xl border border-[#2B3139] bg-[#12161B] p-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#848E9C]">{t("totalSupply")}</span>
          <span className="font-extrabold tabular-nums text-[#EAECEF]">{fmtNum(TOKEN.totalSupply, 0, "en")}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-[#848E9C]">{t("miningPool")}</span>
          <span className="font-extrabold tabular-nums text-[#F0B90B]">{fmtNum(TOKEN.miningPool, 0, "en")}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#0B0E11] px-2.5 py-1.5 text-[10px]">
          <span className="font-mono text-[#848E9C]">{TOKEN.symbol}/BNB</span>
          <span className="font-bold text-[#20B26C]">{PANCAKESWAP.dex}</span>
        </div>
      </div>

      {/* Toggle bahasa */}
      <div className="border-t border-[#2B3139]/80 px-3 py-4">
        <LanguageToggle variant="pill" />
      </div>
    </aside>
  );
}
