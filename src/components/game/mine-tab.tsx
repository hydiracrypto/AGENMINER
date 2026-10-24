"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pickaxe, Loader2, Clock, Shuffle, Sparkles, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GAME, TOKEN, computeReward, fmtNum, randomExamples, streakMultiplier } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import PoolStatsCard from "@/components/game/pool-stats-card";
import type { MineResult } from "@/lib/types";

export default function MineTab() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const setReward = useGameStore((s) => s.setReward);
  const { t, lang } = useT();

  const [prompt, setPrompt] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [justMined, setJustMined] = useState(false);
  const [statsKey, setStatsKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hindari hydration mismatch: contoh prompt acak hanya di client (async, bukan sync-in-effect)
  useEffect(() => {
    const tt = setTimeout(() => setExamples(randomExamples(3, lang)), 0);
    return () => clearTimeout(tt);
  }, [lang]);

  // ticking untuk cooldown
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cooling = useMemo(() => {
    if (!user?.nextMineAt) return null;
    const remaining = user.nextMineAt - now;
    return remaining > 0 ? remaining : null;
  }, [user?.nextMineAt, now]);

  const cooldownPct = useMemo(() => {
    if (cooling === null) return 0;
    return Math.max(0, Math.min(1, 1 - cooling / GAME.cooldownMs));
  }, [cooling]);

  const previewReward = useMemo(() => {
    if (!user) return 0;
    return computeReward(60, user.miningPower, user.streak); // estimasi skor 60
  }, [user]);

  const handleMine = useCallback(async () => {
    if (!user || mining) return;
    const trimmed = prompt.trim();
    setError(null);
    if (trimmed.length < GAME.minPromptLen) {
      setError(t("errPromptShort", { n: GAME.minPromptLen }));
      return;
    }
    setMining(true);
    try {
      const result: MineResult & { refCommission?: number } = await api.mine(user.walletAddress, trimmed, lang);
      setUser(result.user);
      setReward(result);
      setJustMined(true);
      setPrompt("");
      setStatsKey((k) => k + 1); // segarkan statistik pool (mined/remaining)
      setTimeout(() => setJustMined(false), 1600);
    } catch (err) {
      const e = err as Error & { remainingMs?: number; errorKey?: string };
      if (e.remainingMs) {
        setError(t("errCooldown", { n: Math.ceil(e.remainingMs / 1000) }));
      } else if (e.errorKey === "prompt_short") {
        setError(t("errPromptShort", { n: GAME.minPromptLen }));
      } else if (e.errorKey === "prompt_long") {
        setError(t("errPromptLong", { n: GAME.maxPromptLen }));
      } else if (e.errorKey === "duplicate_prompt") {
        setError(t("errDuplicate"));
      } else if (e.errorKey === "pool_empty") {
        setError(t("errPoolEmpty"));
      } else {
        setError(e.message ?? t("errMineFail"));
      }
    } finally {
      setMining(false);
    }
  }, [user, mining, prompt, setUser, setReward, t, lang]);

  if (!user) return null;

  const canMine = cooling === null && !mining;

  return (
    <div className="space-y-5">
      {/* ── Statistik Pool: Total Supply / Network / Mining Pool / Mined / Remaining ── */}
      <PoolStatsCard refreshKey={statsKey} />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
      {/* ── Mining Core ── */}
      <div className="relative flex flex-col items-center pt-2 pb-1 lg:pt-8">
        <div className="relative h-64 w-64 flex items-center justify-center lg:h-72 lg:w-72">
          {/* glow */}
          <div
            className={`absolute inset-6 rounded-full blur-2xl transition-opacity duration-500 ${
              mining ? "bg-[#F0B90B]/40 opacity-100" : justMined ? "bg-[#20B26C]/30 opacity-100" : "bg-[#F0B90B]/15 opacity-80"
            }`}
          />

          {/* cincin orbit 1 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: mining ? 3 : 14, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-[#F0B90B]/35"
          >
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#F0B90B] shadow-[0_0_12px_rgba(240,185,11,0.9)]" />
          </motion.div>

          {/* cincin orbit 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: mining ? 4.5 : 22, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border border-[#A855F7]/30"
          >
            <span className="absolute top-1/2 -right-1 h-2 w-2 rounded-full bg-[#C994F7] shadow-[0_0_10px_rgba(168,85,247,0.9)]" />
          </motion.div>

          {/* progress ring cooldown */}
          {cooling !== null && (
            <svg className="absolute inset-1 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="47" fill="none" stroke="#2B3139" strokeWidth="2.5" />
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="#F0B90B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 47}
                strokeDashoffset={2 * Math.PI * 47 * (1 - cooldownPct)}
              />
            </svg>
          )}

          {/* inti */}
          <motion.button
            onClick={handleMine}
            disabled={!canMine}
            whileTap={canMine ? { scale: 0.94 } : undefined}
            animate={mining ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={mining ? { duration: 0.6, repeat: Infinity } : { type: "spring", stiffness: 300 }}
            className={`relative z-10 flex h-40 w-40 flex-col items-center justify-center rounded-full border-2 transition-colors lg:h-44 lg:w-44 ${
              cooling !== null
                ? "border-[#2B3139] bg-[#181A20]"
                : "border-[#F0B90B] bg-gradient-to-b from-[#1E2329] to-[#0B0E11] hover:border-[#F8D33A] cursor-pointer"
            }`}
            aria-label="Mulai menambang"
          >
            {mining ? (
              <Loader2 className="h-12 w-12 animate-spin text-[#F0B90B]" />
            ) : cooling !== null ? (
              <>
                <Clock className="h-6 w-6 text-[#848E9C] mb-1" />
                <span className="text-2xl font-extrabold tabular-nums text-[#EAECEF]">
                  {Math.ceil(cooling / 1000)}s
                </span>
                <span className="text-[10px] text-[#848E9C]">{t("coolingRig")}</span>
              </>
            ) : (
              <>
                <Pickaxe className="h-11 w-11 text-[#F0B90B] mb-1" />
                <span className="text-sm font-extrabold text-[#EAECEF]">{t("mineBtn")}</span>
                <span className="text-[10px] text-[#848E9C]">{t("viaPromptAI")}</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Info row */}
        <div className="mt-1 flex flex-wrap justify-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 rounded-full bg-[#181A20] border border-[#2B3139] px-3 py-1.5 text-[#848E9C]">
            <Zap className="h-3 w-3 text-[#F0B90B]" /> Power x{user.miningPower}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#181A20] border border-[#2B3139] px-3 py-1.5 text-[#848E9C]">
            <Flame className="h-3 w-3 text-[#F6465D]" />{" "}
            {t("streakDays", { n: user.streak, p: Math.round((streakMultiplier(user.streak) - 1) * 100) })}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#181A20] border border-[#2B3139] px-3 py-1.5 text-[#848E9C]">
            {t("perMine", { n: fmtNum(previewReward, 2, lang), sym: TOKEN.symbol })}
          </span>
        </div>
      </div>

      {/* ── Kolom kanan: Prompt + Cara kerja ── */}
      <div className="space-y-5">
      {/* ── Input Prompt ── */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#C994F7]" />
            {t("miningPrompt")}
          </h3>
          <button
            onClick={() => setExamples(randomExamples(3, lang))}
            className="flex items-center gap-1 text-xs text-[#848E9C] hover:text-[#F0B90B] transition-colors"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {t("randomIdeas")}
          </button>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, GAME.maxPromptLen))}
          placeholder={t("promptPlaceholder")}
          className="min-h-[88px] bg-[#0B0E11] border-[#2B3139] text-sm placeholder:text-[#5E6673] focus-visible:ring-[#F0B90B]/50 resize-none"
          maxLength={GAME.maxPromptLen}
        />

        <div className="flex justify-between text-[11px] text-[#848E9C]">
          <span>{t("charCount", { n: prompt.trim().length, max: GAME.maxPromptLen })}</span>
        </div>

        {examples.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-left text-xs text-[#848E9C] hover:text-[#C994F7] rounded-lg border border-dashed border-[#2B3139] px-3 py-2 hover:border-[#C994F7]/50 transition-colors truncate"
              >
                💡 {ex}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3 text-xs text-[#F6465D]">{error}</div>
        )}

        <Button
          onClick={handleMine}
          disabled={!canMine || prompt.trim().length < GAME.minPromptLen}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-extrabold text-[#0B0E11] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {mining ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("aiMining")}
            </>
          ) : cooling !== null ? (
            <>
              <Clock className="mr-2 h-5 w-5" /> {t("readyIn", { n: Math.ceil(cooling / 1000) })}
            </>
          ) : (
            <>
              <Pickaxe className="mr-2 h-5 w-5" /> {t("startMining", { sym: TOKEN.symbol })}
            </>
          )}
        </Button>
      </div>

      {/* ── Cara kerja ── */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-4">
        <h3 className="text-sm font-bold mb-3">⚙️ {t("howItWorks")}</h3>
        <ol className="space-y-2.5 text-xs text-[#848E9C]">
          <li className="flex gap-2">
            <Step n={1} /> {t("how1")}
          </li>
          <li className="flex gap-2">
            <Step n={2} /> {t("how2", { sym: TOKEN.symbol })}
          </li>
          <li className="flex gap-2">
            <Step n={3} /> {t("how3")}
          </li>
          <li className="flex gap-2">
            <Step n={4} /> {t("how4", { sym: TOKEN.symbol })}
          </li>
        </ol>
      </div>
      </div>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0B90B]/15 text-[10px] font-bold text-[#F0B90B]">
      {n}
    </span>
  );
}
