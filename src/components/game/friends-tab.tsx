"use client";

import { useCallback, useState } from "react";
import { Users, Copy, Check, Share2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/game-config";
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

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Kartu komisi + Bagikan — grid desktop 2 kolom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {/* Kartu komisi */}
      <div className="am-card rounded-2xl border border-[#F0B90B]/30 bg-gradient-to-br from-[#F0B90B]/12 to-[#181A20] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#FCD535]" /> {t("minerTeam")}
            </h3>
            <p className="text-xs text-[#848E9C] mt-0.5">{t("inviteDesc")}</p>
          </div>
          <Coins className="h-8 w-8 text-[#FCD535]" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3.5">
            <p className="text-[10px] text-[#848E9C] uppercase tracking-wide">{t("totalCommission")}</p>
            <p className="text-lg font-extrabold text-[#20B26C] tabular-nums mt-0.5">{fmtNum(user.refEarnings, 2, lang)}</p>
          </div>
          <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3.5">
            <p className="text-[10px] text-[#848E9C] uppercase tracking-wide">{t("inviteCode")}</p>
            <p className="text-sm font-extrabold text-[#F0B90B] tracking-wide mt-0.5 break-all leading-snug">{user.refCode}</p>
            <p className="mt-1 text-[10px] leading-snug text-[#848E9C]">{t("agentIdHint")}</p>
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
            className="w-full h-11 rounded-xl border-[#2B3139] bg-[#0B0E11] text-xs font-bold hover:bg-[#1E2329] whitespace-nowrap truncate px-2"
          >
            {copied === "code" ? <Check className="mr-1.5 h-4 w-4 text-[#20B26C]" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied === "code" ? t("copied") : t("copyCode", { code: user.refCode })}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
