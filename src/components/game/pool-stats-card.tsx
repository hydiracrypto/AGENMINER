"use client";

// ============================================
// AGENTIC MINER — Kartu Statistik Pool (tab Mine)
// Total Supply 100,000,000 AGENMINER • Network BNB Chain
// Mining Pool 70,000,000 • Sudah ditambang • Tersisa
// ============================================

import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { TOKEN, fmtNum } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import type { GlobalStats } from "@/lib/types";

export default function PoolStatsCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t, lang } = useT();
  const [stats, setStats] = useState<GlobalStats | null>(null);

  const load = useCallback(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // Muat ulang saat mount & setiap kali refreshKey berubah (mis. setelah mining sukses)
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const mined = stats?.totalMined ?? 0;
  const remaining = stats?.poolRemaining ?? TOKEN.miningPool;
  const pct = Math.min(100, (mined / TOKEN.miningPool) * 100);

  return (
    <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-4" data-testid="pool-stats-card">
      {/* Judul + indikator LIVE */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <BarChart3 className="h-4 w-4 text-[#F0B90B]" />
          {t("poolStatsTitle")}
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[#20B26C]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20B26C] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20B26C]" />
          </span>
          LIVE
        </span>
      </div>

      {/* Total Supply + Network */}
      <div className="flex items-center justify-between rounded-xl border border-[#2B3139] bg-[#0B0E11] px-3.5 py-2.5">
        <div>
          <p className="text-[10px] text-[#848E9C]">{t("totalSupply")}</p>
          <p className="text-sm font-extrabold tabular-nums">
            {fmtNum(TOKEN.totalSupply, 0, lang)}{" "}
            <span className="text-[10px] font-semibold text-[#F0B90B]">{TOKEN.symbol}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#848E9C]">{t("network")}</p>
          <p className="text-sm font-extrabold text-[#F0B90B]">{TOKEN.chainShort}</p>
        </div>
      </div>

      {/* Progres Mining Pool */}
      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="text-[#848E9C]">
            {t("miningPool")} {fmtNum(TOKEN.miningPool, 0, lang)}
          </span>
          <span className="font-bold text-[#F0B90B] tabular-nums">{pct.toFixed(2)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-[#2B3139] bg-[#0B0E11]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] transition-all"
            style={{ width: `${Math.max(1.5, pct)}%` }}
          />
        </div>
      </div>

      {/* Sudah ditambang + Tersisa */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] px-3.5 py-2.5">
          <p className="text-[10px] text-[#848E9C]">{t("minedOut")}</p>
          <p className="text-sm font-extrabold tabular-nums text-[#20B26C]">
            {stats ? fmtNum(mined, 2, lang) : "—"}{" "}
            <span className="text-[10px] font-semibold text-[#848E9C]">{TOKEN.symbol}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] px-3.5 py-2.5">
          <p className="text-[10px] text-[#848E9C]">{t("remainingLabel")}</p>
          <p className="text-sm font-extrabold tabular-nums text-[#EAECEF]">
            {stats ? fmtNum(remaining, 2, lang) : "—"}{" "}
            <span className="text-[10px] font-semibold text-[#848E9C]">{TOKEN.symbol}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
