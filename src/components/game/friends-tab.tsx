"use client";

import { useCallback, useState } from "react";
import { Users, Copy, Check, Share2, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME, TOKEN, fmtNum } from "@/lib/game-config";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function FriendsTab() {
  const user = useGameStore((s) => s.user);
  const { t, lang } = useT();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const shareLink = typeof window !== "undefined" && user ? `${window.location.origin}/?ref=${user.refCode}` : "";

  const copy = useCallback(async (text: string, which: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard tidak tersedia */
    }
  }, []);

  const share = useCallback(async () => {
    if (!user) return;
    const text = t("shareText", { sym: TOKEN.symbol, code: user.refCode, link: shareLink });
    try {
      if (navigator.share) {
        await navigator.share({ title: "AGENTIC MINER", text, url: shareLink });
      } else {
        await copy(text, "link");
      }
    } catch {
      /* dibatalkan user */
    }
  }, [user, shareLink, copy, t]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Kartu komisi + Bagikan — grid desktop 2 kolom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {/* Kartu komisi */}
      <div className="am-card rounded-2xl border border-[#A855F7]/30 bg-gradient-to-br from-[#A855F7]/12 to-[#181A20] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#C994F7]" /> {t("minerTeam")}
            </h3>
            <p className="text-xs text-[#848E9C] mt-0.5">{t("inviteDesc")}</p>
          </div>
          <Coins className="h-8 w-8 text-[#C994F7]" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3.5">
            <p className="text-[10px] text-[#848E9C] uppercase tracking-wide">{t("totalCommission")}</p>
            <p className="text-lg font-extrabold text-[#20B26C] tabular-nums mt-0.5">{fmtNum(user.refEarnings, 2, lang)}</p>
          </div>
          <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3.5">
            <p className="text-[10px] text-[#848E9C] uppercase tracking-wide">{t("inviteCode")}</p>
            <p className="text-lg font-extrabold text-[#F0B90B] tracking-widest mt-0.5">{user.refCode}</p>
          </div>
        </div>
      </div>

      {/* Bagikan */}
      <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Share2 className="h-4 w-4 text-[#F0B90B]" /> {t("shareTitle")}
        </h3>
        <div className="flex items-center gap-2 rounded-xl bg-[#0B0E11] border border-[#2B3139] px-3 py-2.5">
          <span className="flex-1 truncate text-xs font-mono text-[#848E9C]">{shareLink || "..."}</span>
          <button
            onClick={() => copy(shareLink, "link")}
            className="text-[#848E9C] hover:text-[#F0B90B] transition-colors"
            aria-label="Salin tautan"
          >
            {copied === "link" ? <Check className="h-4 w-4 text-[#20B26C]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => copy(user.refCode, "code")}
            variant="outline"
            className="flex-1 h-11 rounded-xl border-[#2B3139] bg-[#0B0E11] text-sm font-bold hover:bg-[#1E2329]"
          >
            {copied === "code" ? <Check className="mr-1.5 h-4 w-4 text-[#20B26C]" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied === "code" ? t("copied") : t("copyCode", { code: user.refCode })}
          </Button>
          <Button
            onClick={share}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90"
          >
            <Share2 className="mr-1.5 h-4 w-4" /> {t("share")}
          </Button>
        </div>
      </div>
      </div>

      {/* Cara kerja referral */}
      <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3">
          <Gift className="h-4 w-4 text-[#20B26C]" /> {t("howReferral")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RefStep n={1} title={t("ref1Title")} desc={t("ref1Desc")} />
          <RefStep
            n={2}
            title={t("ref2Title")}
            desc={t("ref2Desc", { n: fmtNum(GAME.referrerJoinBonus, 0, lang), sym: TOKEN.symbol })}
          />
          <RefStep n={3} title={t("ref3Title")} desc={t("ref3Desc", { p: GAME.refCommission * 100 })} />
        </div>
      </div>
    </div>
  );
}

function RefStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#2B3139] bg-[#0B0E11] p-4">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#20B26C]/15 text-[11px] font-bold text-[#20B26C]">
        {n}
      </span>
      <div>
        <p className="text-xs font-bold">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#848E9C]">{desc}</p>
      </div>
    </div>
  );
}
