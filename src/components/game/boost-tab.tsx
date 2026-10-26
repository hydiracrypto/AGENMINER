"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Gift, CheckCircle2, Loader2, Flame, ArrowUpRight, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME, TOKEN, fmtNum, upgradeCost } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function BoostTab() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const { t, lang } = useT();
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
      setFeedback({ type: "ok", msg: t("okUpgrade", { lv: res.user.miningPower }) });
    } catch (err) {
      const e = err as Error & { errorKey?: string };
      if (e.errorKey === "insufficient_upgrade") {
        setFeedback({ type: "err", msg: t("errInsufficient", { n: fmtNum(upgradeCost(user.miningPower), 0, lang), sym: TOKEN.symbol }) });
      } else if (e.errorKey === "max_level") {
        setFeedback({ type: "err", msg: t("errMaxLevel") });
      } else if (e.errorKey === "already_checkin") {
        setFeedback({ type: "err", msg: t("errAlreadyCheckin") });
      } else {
        setFeedback({ type: "err", msg: e.message ?? t("errUpgrade") });
      }
    } finally {
      setBusy(null);
    }
  }, [user, busy, setUser, t, lang]);

  const handleCheckin = useCallback(async () => {
    if (!user || busy) return;
    setBusy("checkin");
    setFeedback(null);
    try {
      const res = await api.boost(user.walletAddress, "checkin");
      setUser(res.user);
      setFeedback({
        type: "ok",
        msg: t("okCheckin", { streak: res.streak ?? res.user.streak, n: fmtNum(res.reward ?? 0, 0, lang), sym: TOKEN.symbol }),
      });
    } catch (err) {
      const e = err as Error & { errorKey?: string };
      if (e.errorKey === "already_checkin") {
        setFeedback({ type: "err", msg: t("errAlreadyCheckin") });
      } else {
        setFeedback({ type: "err", msg: e.message ?? t("errCheckin") });
      }
    } finally {
      setBusy(null);
    }
  }, [user, busy, setUser, t, lang]);

  if (!user) return null;

  const atMaxLevel = user.miningPower >= GAME.maxMiningPower;
  const canAfford = !atMaxLevel && user.balance >= cost;
  const tokenomics = [
    { label: t("tmPool"), value: TOKEN.miningPool, pct: 70, color: "#F0B90B" },
    { label: t("tmTeam"), value: TOKEN.teamTreasury, pct: 10, color: "#A855F7" },
    { label: t("tmMarketing"), value: TOKEN.marketing, pct: 10, color: "#20B26C" },
    { label: t("tmLiquidity"), value: TOKEN.liquidity, pct: 10, color: "#5E6673" },
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

      {/* Upgrade + Check-in — grid desktop 2 kolom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {/* ── Upgrade Power ── */}
      <div className="am-card rounded-2xl border border-[#F0B90B]/30 bg-gradient-to-br from-[#F0B90B]/10 to-[#181A20] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#F0B90B]" /> Mining Power
            </h3>
            <p className="text-xs text-[#848E9C] mt-0.5">{t("boostDesc")}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-[#F0B90B]">x{user.miningPower}</p>
            <p className="text-[10px] text-[#848E9C]">{t("level", { n: user.miningPower })}</p>
          </div>
        </div>

        {atMaxLevel ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-[#0B0E11] border border-[#F0B90B]/50 px-4 py-3">
              <div className="text-xs text-[#848E9C]">
                x{GAME.maxMiningPower} MAX
              </div>
              <span className="rounded-full bg-[#F0B90B]/15 border border-[#F0B90B]/40 px-3 py-1 text-[10px] font-extrabold text-[#F0B90B]">
                {t("maxLevelBadge")}
              </span>
            </div>
            <p className="text-[11px] text-[#848E9C]">{t("maxLevelNote")}</p>
          </div>
        ) : (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0B0E11] border border-[#2B3139] px-4 py-3">
          <div className="text-xs text-[#848E9C]">
            {t("upgradeTo", { n: user.miningPower + 1 })}
            <p className="text-[10px] mt-0.5">{t("cost", { c: fmtNum(cost, 0, lang), sym: TOKEN.symbol })}</p>
          </div>
          <Button
            onClick={handleUpgrade}
            disabled={!canAfford || busy !== null}
            className="h-10 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90 disabled:opacity-40"
          >
            {busy === "upgrade" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            {t("upgrade")}
          </Button>
        </div>
        )}
        {!atMaxLevel && !canAfford && (
          <p className="mt-2 text-[11px] text-[#848E9C]">
            {t("needMoreUpgrade", { n: fmtNum(cost - user.balance, 0, lang), sym: TOKEN.symbol })}
          </p>
        )}
      </div>

      {/* ── Check-in Harian ── */}
      <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Gift className="h-4 w-4 text-[#20B26C]" /> {t("dailyCheckin")}
        </h3>
        <p className="text-xs text-[#848E9C] mt-0.5">
          {t("checkinDesc", { n: fmtNum(GAME.checkinBaseReward, 0, lang) })}
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
              <Cake className="mr-1.5 h-4 w-4" /> {t("checkinNow")}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("checkedIn")}
            </>
          )}
        </Button>
      </div>
      </div>

      {/* ── Tokenomics ── */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold">📊 {t("tokenomics", { sym: TOKEN.symbol })}</h3>
        <p className="text-xs text-[#848E9C] mt-0.5">{t("fixedSupplyNote", { n: fmtNum(TOKEN.totalSupply, 0, lang) })}</p>
        <div className="mt-4 flex h-3 rounded-full overflow-hidden">
          {tokenomics.map((tk) => (
            <div key={tk.label} style={{ width: `${tk.pct}%`, backgroundColor: tk.color }} title={tk.label} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tokenomics.map((tk) => (
            <div key={tk.label} className="flex items-center gap-2 rounded-xl bg-[#0B0E11] px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tk.color }} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate">{tk.label}</p>
                <p className="text-[10px] text-[#848E9C]">
                  {fmtNum(tk.value, 0, lang)} • {tk.pct}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
