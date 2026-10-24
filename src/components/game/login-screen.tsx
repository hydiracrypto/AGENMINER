"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Zap, Users, Trophy, Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { TOKEN, GAME, fmtNum } from "@/lib/game-config";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { GlobalStats } from "@/lib/types";
import LanguageToggle from "@/components/game/language-toggle";
import CryptoCountries from "@/components/game/crypto-countries";

export default function LoginScreen() {
  const setConnectOpen = useGameStore((s) => s.setConnectOpen);
  const { t, lang } = useT();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      // statistik token
      try {
        const s = await api.stats();
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setStats(null);
      }
      // tangkap kode referral dari URL: ?ref=CODE
      try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("ref");
        if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
          const upper = ref.toUpperCase();
          const url = new URL(window.location.href);
          url.searchParams.delete("ref");
          window.history.replaceState({}, "", url.toString());
          if (!cancelled) setRefCode(upper);
        }
      } catch {
        /* ignore */
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const copyRef = async () => {
    if (!refCode) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}?ref=${refCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const poolPct = stats ? Math.min(100, (stats.totalMined / stats.miningPool) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
      {/* Glow dekoratif */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-[#F0B90B]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#A855F7]/10 blur-3xl" />

      {/* Toggle bahasa — pojok kanan atas */}
      <div className="absolute right-4 top-4 z-10">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        {/* Logo AGENTIC MINER */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-3 rounded-full border-2 border-dashed border-[#F0B90B]/40"
          />
          <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-[#F0B90B]/60 shadow-[0_0_60px_rgba(240,185,11,0.4)] bg-[#0B0E11]">
            <img src="/logo.png" alt="AGENTIC MINER logo" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            AGENTIC <span className="text-[#F0B90B]">MINER</span>
          </h1>
          <p className="mt-1 text-sm text-[#848E9C]">
            {t("loginTagline", { chain: TOKEN.chainShort, sym: TOKEN.symbol })}
          </p>
        </div>

        {/* Badge referral */}
        {refCode && (
          <div className="flex items-center gap-2 rounded-full border border-[#F0B90B]/40 bg-[#F0B90B]/10 px-4 py-2 text-sm">
            <Users className="h-4 w-4 text-[#F0B90B]" />
            <span>
              {t("invitedWith")} <span className="font-bold text-[#F0B90B]">{refCode}</span>
            </span>
            <button onClick={copyRef} className="text-[#848E9C] hover:text-[#EAECEF]" aria-label="Salin tautan undangan">
              {copied ? <Check className="h-4 w-4 text-[#20B26C]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Kartu statistik token */}
        <div className="w-full rounded-2xl border border-[#2B3139] bg-[#181A20] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#848E9C]">{t("totalSupply")}</p>
              <p className="text-lg font-bold">
                {fmtNum(TOKEN.totalSupply, 0, lang)} <span className="text-xs font-normal text-[#848E9C]">{TOKEN.symbol}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#848E9C]">{t("network")}</p>
              <p className="text-lg font-bold text-[#F0B90B]">{TOKEN.chainShort}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#848E9C] mb-1.5">
              <span>
                {t("miningPool")} {fmtNum(TOKEN.miningPool, 0, lang)}
              </span>
              <span>{stats ? t("remaining", { n: fmtNum(stats.poolRemaining, 0, lang) }) : t("loading")}</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#0B0E11] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] transition-all"
                style={{ width: `${Math.max(2, poolPct)}%` }}
              />
            </div>
            {stats && (
              <div className="mt-2 flex justify-between text-[11px]">
                <span className="font-semibold text-[#20B26C]">
                  {t("minedOut")} {fmtNum(stats.totalMined, 0, lang)} {TOKEN.symbol}
                </span>
                <span className="text-[#848E9C] tabular-nums">{poolPct.toFixed(2)}%</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <MiniStat icon={<Zap className="h-4 w-4" />} label={t("featMining")} />
            <MiniStat icon={<Users className="h-4 w-4" />} label={t("featReferral")} />
            <MiniStat icon={<Trophy className="h-4 w-4" />} label={t("featLeaderboard")} />
          </div>
        </div>

        {/* Tombol utama */}
        <Button
          onClick={() => setConnectOpen(true)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] text-[#0B0E11] text-sm sm:text-base font-extrabold hover:opacity-90 shadow-[0_8px_30px_rgba(240,185,11,0.3)] px-3"
        >
          <Wallet className="mr-2 h-5 w-5 shrink-0" />
          <span className="truncate">{t("signInWallet")}</span>
        </Button>

        <p className="text-center text-xs text-[#848E9C] max-w-xs flex items-start gap-1.5">
          <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#F0B90B]" />
          {t("loginFooter", { s: GAME.cooldownMs / 1000 })}
        </p>

        {/* Negara pengguna kripto terbanyak — preview top 5 */}
        <CryptoCountries limit={5} />
      </motion.div>
    </div>
  );
}

function MiniStat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-[#0B0E11] py-3">
      <span className="text-[#F0B90B]">{icon}</span>
      <span className="text-[11px] text-[#848E9C]">{label}</span>
    </div>
  );
}
