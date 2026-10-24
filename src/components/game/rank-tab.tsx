"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy, RefreshCw, Medal } from "lucide-react";
import { TOKEN, fmtNum } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { LeaderboardRow } from "@/lib/types";
import CryptoCountries from "@/components/game/crypto-countries";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankTab() {
  const user = useGameStore((s) => s.user);
  const { t, lang } = useT();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [meRank, setMeRank] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.leaderboard(user.walletAddress);
      setRows(res.rows);
      setMeRank(res.meRank);
    } catch {
      /* biarkan kosong */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="space-y-4">
      {/* My rank card */}
      <div className="am-card rounded-2xl border border-[#F0B90B]/30 bg-gradient-to-br from-[#F0B90B]/12 to-[#181A20] p-5 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0B90B]/15 text-2xl">
          <Trophy className="h-6 w-6 text-[#F0B90B]" />
        </span>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wide text-[#848E9C]">{t("yourRank")}</p>
          <p className="text-2xl font-extrabold text-[#F0B90B] tabular-nums">
            {meRank > 0 ? `#${meRank}` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-[#848E9C]">{t("totalMined")}</p>
          <p className="text-lg font-extrabold tabular-nums">{fmtNum(user.totalMined, 2, lang)}</p>
          <p className="text-[10px] text-[#848E9C]">{TOKEN.symbol}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Medal className="h-4 w-4 text-[#F0B90B]" /> {t("top50")}
        </h3>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-[#848E9C] hover:text-[#F0B90B] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> {t("refresh")}
        </button>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#848E9C]">{t("loadingRank")}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#848E9C]">{t("emptyRank", { sym: TOKEN.symbol })}</div>
        ) : (
          <ul className="divide-y divide-[#2B3139] max-h-[60vh] overflow-y-auto agenminer-scroll">
            {rows.map((row) => (
              <li
                key={row.walletAddress}
                className={`flex items-center gap-3 px-4 py-3 ${row.isMe ? "bg-[#F0B90B]/10 border-l-2 border-[#F0B90B]" : ""}`}
              >
                <span className="w-8 text-center text-sm font-extrabold tabular-nums text-[#848E9C]">
                  {row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B0E11] border border-[#2B3139] text-lg">
                  {row.avatar}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${row.isMe ? "text-[#F0B90B]" : ""}`}>
                    {row.username} {row.isMe && <span className="text-[10px] text-[#848E9C]">({t("you")})</span>}
                  </p>
                  <p className="text-[11px] text-[#848E9C] font-mono">{row.walletAddress}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold tabular-nums">{fmtNum(row.totalMined, 2, lang)}</p>
                  <p className="text-[10px] text-[#848E9C]">Pw x{row.miningPower}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      {/* Negara dengan pengguna kripto terbanyak — kolom kanan desktop */}
      <CryptoCountries limit={10} />
      </div>
    </div>
  );
}
