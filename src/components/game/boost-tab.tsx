"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Gift, CheckCircle2, Loader2, Flame, ArrowUpRight, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME, TOKEN, fmtNum, upgradeCost } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";

export default function BoostTab() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const [busy, setBusy] = useState<"upgrade" | "checkin" | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const cost = useMemo(() => (user ? upgradeCost(user.miningPower) : 0), [user]);

  const handleUpgrade = useCallback(async () => {
    if (!user || busy) return;
    setBusy("upgrade");
    setFeedback(null);
    try {
      const res = await api.boost(user.walletAddress, "upgrade");
      setUser(res.user);
      setFeedback({ type: "ok", msg: res.message });
    } catch (err) {
      setFeedback({ type: "err", msg: err instanceof Error ? err.message : "Gagal upgrade" });
    } finally {
      setBusy(null);
    }
  }, [user, busy, setUser]);

  const handleCheckin = useCallback(async () => {
    if (!user || busy) return;
    setBusy("checkin");
    setFeedback(null);
    try {
      const res = await api.boost(user.walletAddress, "checkin");
      setUser(res.user);
      setFeedback({ type: "ok", msg: res.message });
    } catch (err) {
      setFeedback({ type: "err", msg: err instanceof Error ? err.message : "Gagal check-in" });
    } finally {
      setBusy(null);
    }
  }, [user, busy, setUser]);

  if (!user) return null;

  const canAfford = user.balance >= cost;
  const tokenomics = [
    { label: "Pool Mining", value: TOKEN.miningPool, pct: 70, color: "#F0B90B" },
    { label: "Tim & Treasury", value: TOKEN.teamTreasury, pct: 10, color: "#A855F7" },
    { label: "Marketing", value: TOKEN.marketing, pct: 10, color: "#20B26C" },
    { label: "Likuiditas DEX", value: TOKEN.liquidity, pct: 10, color: "#5E6673" },
  ];

  return (
    <div className="space-y-4">
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-3 text-xs ${
            feedback.type === "ok"
              ? "border-[#20B26C]/40 bg-[#20B26C]/10 text-[#20B26C]"
              : "border-[#F6465D]/40 bg-[#F6465D]/10 text-[#F6465D]"
          }`}
        >
          {feedback.msg}
        </motion.div>
      )}

      {/* ── Upgrade Power ── */}
      <div className="rounded-2xl border border-[#F0B90B]/30 bg-gradient-to-br from-[#F0B90B]/10 to-[#181A20] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#F0B90B]" /> Mining Power
            </h3>
            <p className="text-xs text-[#848E9C] mt-0.5">Setiap level melipatgandakan reward tambang</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-[#F0B90B]">x{user.miningPower}</p>
            <p className="text-[10px] text-[#848E9C]">Level {user.miningPower}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0B0E11] border border-[#2B3139] px-4 py-3">
          <div className="text-xs text-[#848E9C]">
            Upgrade ke <span className="font-bold text-[#EAECEF]">x{user.miningPower + 1}</span>
            <p className="text-[10px] mt-0.5">Biaya: {fmtNum(cost)} {TOKEN.symbol}</p>
          </div>
          <Button
            onClick={handleUpgrade}
            disabled={!canAfford || busy !== null}
            className="h-10 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90 disabled:opacity-40"
          >
            {busy === "upgrade" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            Upgrade
          </Button>
        </div>
        {!canAfford && (
          <p className="mt-2 text-[11px] text-[#848E9C]">
            Kurang {fmtNum(cost - user.balance)} {TOKEN.symbol} — tambang lagi untuk mengumpulkan!
          </p>
        )}
      </div>

      {/* ── Check-in Harian ── */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Gift className="h-4 w-4 text-[#20B26C]" /> Check-in Harian
        </h3>
        <p className="text-xs text-[#848E9C] mt-0.5">
          Bonus {fmtNum(GAME.checkinBaseReward)} × Power × Streak setiap hari + jaga streak tetap hidup
        </p>

        {/* 7 hari streak */}
        <div className="mt-4 flex justify-between gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const active = i < user.streak;
            return (
              <div
                key={i}
                className={`flex-1 rounded-lg py-2 text-center text-[10px] font-bold border ${
                  active
                    ? "bg-[#20B26C]/15 border-[#20B26C]/40 text-[#20B26C]"
                    : "bg-[#0B0E11] border-[#2B3139] text-[#5E6673]"
                }`}
              >
                <Flame className={`mx-auto h-3 w-3 ${active ? "" : "opacity-30"}`} />
                <span className="mt-0.5 block">{i + 1}</span>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleCheckin}
          disabled={!user.canCheckin || busy !== null}
          className={`mt-4 w-full h-11 rounded-xl font-bold ${
            user.canCheckin
              ? "bg-[#20B26C] text-white hover:bg-[#20B26C]/90"
              : "bg-[#1E2329] text-[#5E6673] cursor-not-allowed"
          }`}
        >
          {busy === "checkin" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : user.canCheckin ? (
            <>
              <Cake className="mr-1.5 h-4 w-4" /> Check-in Sekarang
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Sudah check-in hari ini
            </>
          )}
        </Button>
      </div>

      {/* ── Tokenomics ── */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold">📊 Tokenomics {TOKEN.symbol}</h3>
        <p className="text-xs text-[#848E9C] mt-0.5">
          Total suplai tetap {fmtNum(TOKEN.totalSupply, 0)} token — tanpa inflasi
        </p>
        <div className="mt-4 flex h-3 rounded-full overflow-hidden">
          {tokenomics.map((t) => (
            <div key={t.label} style={{ width: `${t.pct}%`, backgroundColor: t.color }} title={t.label} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {tokenomics.map((t) => (
            <div key={t.label} className="flex items-center gap-2 rounded-xl bg-[#0B0E11] px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate">{t.label}</p>
                <p className="text-[10px] text-[#848E9C]">
                  {fmtNum(t.value, 0)} • {t.pct}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
