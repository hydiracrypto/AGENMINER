"use client";

import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, TrendingUp, X } from "lucide-react";
import { TOKEN, fmtNum } from "@/lib/game-config";
import { useT } from "@/lib/i18n";
import type { MineResult } from "@/lib/types";

export default function RewardModal({ result, onClose }: { result: MineResult | null; onClose: () => void }) {
  const { t, lang } = useT();
  return (
    <Dialog open={result !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl border-[#F0B90B]/40 bg-[#181A20] text-[#EAECEF] p-0 gap-0 overflow-hidden">
        {result && (
          <div className="relative">
            <DialogTitle className="sr-only">{t("miningResult", { sym: TOKEN.symbol })}</DialogTitle>
            {/* glow atas */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[#F0B90B]/25 blur-3xl pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full bg-[#0B0E11]/70 p-1.5 text-[#848E9C] hover:text-[#EAECEF]"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#F0B90B]/60 bg-[#0B0E11] shadow-[0_0_50px_rgba(240,185,11,0.5)]"
              >
                <img src="/logo.png" alt="AGENTIC MINER" className="h-full w-full object-cover" />
              </motion.div>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="mt-4 text-3xl font-extrabold text-[#F0B90B] tabular-nums"
              >
                +{fmtNum(result.reward, 2, lang)} {TOKEN.symbol}
              </motion.p>
              <p className="text-xs text-[#848E9C] mt-1">{t("minedToBalance")}</p>

              {/* Skor AI */}
              <div className="mt-5 w-full space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#848E9C]">
                    <TrendingUp className="h-3.5 w-3.5 text-[#FCD535]" /> {t("aiScore")}
                  </span>
                  <span className="font-extrabold text-[#FCD535] tabular-nums">{result.score}/100</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#0B0E11] overflow-hidden border border-[#2B3139]">
                  <motion.div
                    key={`${result.reward}-${result.score}-${result.summary}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[#F8D33A] to-[#F0B90B]"
                  />
                </div>
              </div>

              {/* Narasi AI */}
              <div className="mt-5 w-full rounded-xl border border-[#2B3139] bg-[#0B0E11] p-3.5 text-left">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#FCD535] mb-1.5">
                  <Bot className="h-3.5 w-3.5" /> Agentic AI Miner
                </p>
                <p className="text-xs leading-relaxed text-[#EAECEF]">{result.summary}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-[#848E9C]">{result.response}</p>
              </div>

              <Button
                onClick={onClose}
                className="mt-5 w-full h-11 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-extrabold text-[#0B0E11] hover:opacity-90"
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> {t("keepMining")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
