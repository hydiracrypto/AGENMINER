"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Copy,
  Check,
  Share2,
  Coins,
  Gift,
  ChevronLeft,
  ChevronRight,
  Twitter,
  Facebook,
  Send,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME, TOKEN, fmtNum } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { ReferralsResult } from "@/lib/types";

export default function FriendsTab() {
  const user = useGameStore((s) => s.user);
  const { t, lang } = useT();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // ── Daftar referral (paginasi 20/halaman) ──
  const [refData, setRefData] = useState<ReferralsResult | null>(null);
  const [refPage, setRefPage] = useState(1);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  const shareLink =
    typeof window !== "undefined" && user ? `${window.location.origin}/?ref=${user.refCode}` : "";

  const loadReferrals = useCallback(
    async (address: string, page: number) => {
      setRefLoading(true);
      setRefError(null);
      try {
        const data = await api.referrals(address, page);
        setRefData(data);
        setRefPage(data.page);
      } catch (e) {
        // 404 = akun belum terdaftar di server (mis. DB production di-reset saat
        // publish) → perlakukan sebagai tim kosong, BUKAN error.
        const status = (e as { status?: number } | null)?.status;
        if (status === 404) {
          setRefData({ items: [], total: 0, page: 1, totalPages: 1, limit: 20 });
          setRefPage(1);
        } else {
          // Error lain → pesan jujur + tombol coba lagi (bukan "Mining failed")
          setRefError(t("refLoadFail"));
        }
      } finally {
        setRefLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!user) return;
    void loadReferrals(user.walletAddress, 1);
  }, [user, loadReferrals]);

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
      }
    } catch {
      /* dibatalkan user */
    }
  }, [user, shareLink, t]);

  if (!user) return null;

  // Teks & URL share — dipakai menu sosmed + native share
  const shareText = t("shareText", { sym: TOKEN.symbol, code: user.refCode, link: shareLink });
  const enc = encodeURIComponent;
  const SOCIALS: { label: string; icon: React.ReactNode; url: string }[] = [
    {
      label: "X / Twitter",
      icon: <Twitter className="h-4 w-4" />,
      url: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(shareLink)}`,
    },
    {
      label: "Telegram",
      icon: <Send className="h-4 w-4" />,
      url: `https://t.me/share/url?url=${enc(shareLink)}&text=${enc(shareText)}`,
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      url: `https://wa.me/?text=${enc(`${shareText}`)}`,
    },
    {
      label: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareLink)}`,
    },
  ];

  const openSocial = (url: string) => {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* popup diblokir */
    }
  };

  const goPage = (p: number) => {
    if (refLoading || !refData) return;
    const target = Math.min(Math.max(1, p), refData.totalPages);
    void loadReferrals(user.walletAddress, target);
  };

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

        {/* Bagikan — link + Copy Code + Share ke semua sosmed */}
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
              className="flex-1 h-11 rounded-xl border-[#2B3139] bg-[#0B0E11] text-xs font-bold hover:bg-[#1E2329] whitespace-nowrap truncate px-2"
            >
              {copied === "code" ? <Check className="mr-1.5 h-4 w-4 text-[#20B26C]" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied === "code" ? t("copied") : t("copyCode", { code: user.refCode })}
            </Button>
            <Button
              onClick={() => {
                // Perangkat dgn Web Share API -> share sheet OS; selain itu -> menu sosmed
                if (typeof navigator !== "undefined" && "share" in navigator) {
                  void share();
                } else {
                  setShareOpen((v) => !v);
                }
              }}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90"
            >
              <Share2 className="mr-1.5 h-4 w-4" /> {t("share")}
            </Button>
          </div>

          {/* Menu share sosmed — X, Telegram, WhatsApp, Facebook (+ native share) */}
          {shareOpen && (
            <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#848E9C]">
                {t("shareTitle")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SOCIALS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => openSocial(s.url)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-[#2B3139] bg-[#181A20] py-2.5 text-[#848E9C] transition-colors hover:border-[#F0B90B]/50 hover:text-[#F0B90B]"
                    aria-label={`Share ke ${s.label}`}
                  >
                    {s.icon}
                    <span className="text-[9px] font-semibold leading-none">{s.label}</span>
                  </button>
                ))}
              </div>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={() => {
                    navigator
                      .share({ title: "AGENTIC MINER", text: shareText, url: shareLink })
                      .catch(() => undefined);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2B3139] py-2 text-[11px] font-semibold text-[#848E9C] transition-colors hover:border-[#F0B90B]/50 hover:text-[#F0B90B]"
                >
                  <Share2 className="h-3.5 w-3.5" /> {t("shareMore")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Daftar miner yang bergabung via link referral (paginasi 20/hal) ── */}
      <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#F0B90B]" /> {t("refListTitle")}
          </h3>
          {refData && (
            <span className="rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/30 px-2.5 py-0.5 text-[10px] font-extrabold text-[#F0B90B] tabular-nums">
              {fmtNum(refData.total, 0, lang)}
            </span>
          )}
        </div>

        {refError && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3">
            <span className="text-xs text-[#F6465D]">{refError}</span>
            <button
              onClick={() => void loadReferrals(user.walletAddress, refPage)}
              className="shrink-0 rounded-lg border border-[#F6465D]/50 px-2.5 py-1.5 text-[11px] font-bold text-[#F6465D] transition-colors hover:bg-[#F6465D]/15"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {refLoading && !refData && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#848E9C]">
            <Loader2 className="h-4 w-4 animate-spin" /> ...
          </div>
        )}

        {refData && refData.items.length === 0 && (
          <p className="mt-3 rounded-xl border border-dashed border-[#2B3139] bg-[#0B0E11] p-4 text-center text-xs leading-relaxed text-[#848E9C]">
            {t("refEmpty")}
          </p>
        )}

        {refData && refData.items.length > 0 && (
          <>
            <ul className="mt-3 flex flex-col gap-2">
              {refData.items.map((m) => (
                <li
                  key={m.walletAddress}
                  className="flex items-center gap-3 rounded-xl border border-[#2B3139] bg-[#0B0E11] px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2B3139] bg-[#181A20] text-lg">
                    {m.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="truncate">{m.username}</span>
                      {m.verifiedAgent && (
                        <span className="shrink-0 rounded-full bg-[#F0B90B]/15 border border-[#F0B90B]/40 px-1.5 py-0.5 text-[8px] font-extrabold text-[#F0B90B]">
                          AGENT
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-[10px] text-[#848E9C]">{m.walletAddress}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-bold text-[#20B26C] tabular-nums">
                      ⛏ {fmtNum(m.totalMined, 0, lang)}
                    </p>
                    <p className="text-[9px] text-[#848E9C]">
                      {t("refJoinedOn", { date: new Date(m.joinedAt).toLocaleDateString(lang === "en" ? "en-US" : "zh-CN") })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Paginasi Previous / Next */}
            {refData.totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button
                  onClick={() => goPage(refPage - 1)}
                  disabled={refLoading || refPage <= 1}
                  variant="outline"
                  className="h-9 rounded-xl border-[#2B3139] bg-[#0B0E11] px-3 text-xs font-bold hover:bg-[#1E2329] disabled:opacity-40"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> {t("prev")}
                </Button>
                <span className="text-[11px] font-semibold text-[#848E9C] tabular-nums">
                  {t("pageOf", { page: fmtNum(refPage, 0, lang), total: fmtNum(refData.totalPages, 0, lang) })}
                </span>
                <Button
                  onClick={() => goPage(refPage + 1)}
                  disabled={refLoading || refPage >= refData.totalPages}
                  variant="outline"
                  className="h-9 rounded-xl border-[#2B3139] bg-[#0B0E11] px-3 text-xs font-bold hover:bg-[#1E2329] disabled:opacity-40"
                >
                  {t("next")} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
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
