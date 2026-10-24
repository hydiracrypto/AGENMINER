"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Zap, Users, Trophy, Link2, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { TOKEN, GAME, fmtNum } from "@/lib/game-config";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { GlobalStats } from "@/lib/types";
import LanguageToggle from "@/components/game/language-toggle";
import CryptoCountries from "@/components/game/crypto-countries";
import PageBackground from "@/components/game/page-background";

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
    <div className="relative min-h-screen overflow-hidden bg-[#0B0E11] text-[#EAECEF]">
      <PageBackground />

      {/* Toggle bahasa — pojok kanan atas */}
      <div className="absolute right-4 top-4 z-20">
        <LanguageToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10 md:max-w-xl md:px-8 lg:max-w-6xl lg:grid lg:grid-cols-[1.05fr_400px] lg:items-center lg:gap-14 lg:px-10">
        {/* ════ Kolom brand (mobile: atas, desktop: kiri) ════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-5 lg:items-start"
        >
          {/* Logo AGENTIC MINER */}
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-3 rounded-full border-2 border-dashed border-[#F0B90B]/40"
            />
            <div className="am-float h-24 w-24 overflow-hidden rounded-full border-2 border-[#F0B90B]/60 bg-[#0B0E11] shadow-[0_0_60px_rgba(240,185,11,0.4)] lg:h-32 lg:w-32">
              <img src="/logo.png" alt="AGENTIC MINER logo" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight lg:text-5xl lg:leading-tight">
              AGENTIC <span className="am-title-gradient">MINER</span>
            </h1>
            <p className="mt-1.5 text-sm text-[#848E9C] lg:mt-3 lg:text-base lg:leading-relaxed">
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

          {/* Daftar fitur — desktop only */}
          <ul className="hidden w-full max-w-lg flex-col gap-4 pt-3 lg:flex">
            <LoginFeature
              icon={<Sparkles className="h-5 w-5 text-[#C994F7]" />}
              title={t("featMining")}
              desc={t("featMiningDesc")}
            />
            <LoginFeature
              icon={<Users className="h-5 w-5 text-[#F0B90B]" />}
              title={t("featReferral")}
              desc={t("featReferralDesc")}
            />
            <LoginFeature
              icon={<Trophy className="h-5 w-5 text-[#20B26C]" />}
              title={t("featLeaderboard")}
              desc={t("featLeaderboardDesc")}
            />
          </ul>
        </motion.div>

        {/* ════ Kolom kartu (mobile: bawah, desktop: kanan) ════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex w-full flex-col items-center gap-5"
        >
          {/* Kartu statistik token */}
          <div className="am-card w-full rounded-2xl border border-[#2B3139] bg-[#181A20]/90 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#848E9C]">{t("totalSupply")}</p>
                <p className="text-lg font-bold">
                  {fmtNum(TOKEN.totalSupply, 0, lang)}{" "}
                  <span className="text-xs font-normal text-[#848E9C]">{TOKEN.symbol}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#848E9C]">{t("network")}</p>
                <p className="text-lg font-bold text-[#F0B90B]">{TOKEN.chainShort}</p>
              </div>
            </div>

            <div className="pt-4">
              <div className="mb-1.5 flex justify-between text-xs text-[#848E9C]">
                <span>
                  {t("miningPool")} {fmtNum(TOKEN.miningPool, 0, lang)}
                </span>
                <span>{stats ? t("remaining", { n: fmtNum(stats.poolRemaining, 0, lang) }) : t("loading")}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#0B0E11]">
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
                  <span className="tabular-nums text-[#848E9C]">{poolPct.toFixed(2)}%</span>
                </div>
              )}
            </div>

            {/* Mini fitur — mobile only (desktop punya daftar fitur di kiri) */}
            <div className="grid grid-cols-3 gap-2 pt-4 lg:hidden">
              <MiniStat icon={<Zap className="h-4 w-4" />} label={t("featMining")} />
              <MiniStat icon={<Users className="h-4 w-4" />} label={t("featReferral")} />
              <MiniStat icon={<Trophy className="h-4 w-4" />} label={t("featLeaderboard")} />
            </div>
          </div>

          {/* Tombol utama */}
          <Button
            onClick={() => setConnectOpen(true)}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] px-3 text-sm font-extrabold text-[#0B0E11] shadow-[0_8px_30px_rgba(240,185,11,0.3)] hover:opacity-90 sm:text-base"
          >
            <Wallet className="mr-2 h-5 w-5 shrink-0" />
            <span className="truncate">{t("signInWallet")}</span>
          </Button>

          <p className="flex max-w-xs items-start gap-1.5 text-center text-xs text-[#848E9C] lg:max-w-none lg:text-left">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F0B90B]" />
            {t("loginFooter", { s: GAME.cooldownMs / 1000 })}
          </p>

          {/* Negara pengguna kripto terbanyak — preview top 5 */}
          <div className="w-full">
            <CryptoCountries limit={5} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoginFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2B3139] bg-[#12161B]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[#848E9C]">{desc}</p>
      </div>
    </li>
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
