"use client";

import { Pickaxe, Zap, Users, Trophy, Wallet } from "lucide-react";
import { useGameStore, type GameTab } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function BottomNav() {
  const tab = useGameStore((s) => s.tab);
  const setTab = useGameStore((s) => s.setTab);
  const { t } = useT();

  const TABS: { id: GameTab; label: string; icon: React.ReactNode }[] = [
    { id: "mine", label: t("navMine"), icon: <Pickaxe className="h-5 w-5" /> },
    { id: "boost", label: t("navBoost"), icon: <Zap className="h-5 w-5" /> },
    { id: "friends", label: t("navFriends"), icon: <Users className="h-5 w-5" /> },
    { id: "rank", label: t("navRank"), icon: <Trophy className="h-5 w-5" /> },
    { id: "wallet", label: t("navWallet"), icon: <Wallet className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-3 mb-3 rounded-2xl border border-[#2B3139] bg-[#181A20]/95 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <ul className="flex items-stretch">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <li key={t.id} className="flex-1">
                <button
                  onClick={() => setTab(t.id)}
                  className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-2.5 transition-colors ${
                    active ? "text-[#F0B90B]" : "text-[#5E6673] hover:text-[#848E9C]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={active ? "drop-shadow-[0_0_8px_rgba(240,185,11,0.6)]" : ""}>{t.icon}</span>
                  <span className="text-[10px] font-bold">{t.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
