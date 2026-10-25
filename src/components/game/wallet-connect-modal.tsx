"use client";

// ============================================
// AGENTIC MINER — Agent Wallet Connect (ala ptah.trade)
// Pairing server-backed yang benar-benar berfungsi:
// 1. Modal membuat sesi pairing (POST /api/pair/create)
// 2. QR membuka halaman /pair/{code} (bisa discan kamera HP mana pun)
// 3. Halaman pair menyetujui (POST /api/pair/approve) → akun + Agent ID dibuat
// 4. Modal polling /api/pair/status → otomatis login saat APPROVED
// Tombol "Confirm" = shortcut approve di perangkat yang sama (demo).
// ============================================

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Keyboard,
  ChevronDown,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  connectProvider,
  getWalletOptions,
  saveSession,
  type WalletOption,
} from "@/lib/wallet";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { isValidEvmAddress } from "@/lib/game-config";
import type { PublicUser } from "@/lib/types";

const PAIR_TTL = 300; // detik — sama seperti ptah.trade
const POLL_MS = 2500;

interface Props {
  open: boolean;
  onClose: () => void;
  refCode?: string | null;
}

type Phase = "connecting" | "confirming" | "expired";

function newPairingCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += Math.floor(Math.random() * 16).toString(16);
  return c;
}

/** Alamat EVM acak untuk mode demo (simulasi wallet Binance) */
function randomEvmAddress(): string {
  const hex = "0123456789abcdef";
  let a = "0x";
  for (let i = 0; i < 40; i++) a += hex[Math.floor(Math.random() * 16)];
  return a;
}

export default function WalletConnectModal({ open, onClose, refCode }: Props) {
  const setUser = useGameStore((s) => s.setUser);
  const { t } = useT();

  const [phase, setPhase] = useState<Phase>("connecting");
  const [pairCode, setPairCode] = useState("");
  const [pairUrl, setPairUrl] = useState("");
  const [qrData, setQrData] = useState("");
  const [secsLeft, setSecsLeft] = useState(PAIR_TTL);
  const [copiedPair, setCopiedPair] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fallback wallet browser (EIP-6963 / injected)
  const [showBrowser, setShowBrowser] = useState(false);
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const mounted = useRef(true);
  const pollIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const pairCodeRef = useRef("");

  const stopPoll = useCallback(() => {
    if (pollIv.current) {
      clearInterval(pollIv.current);
      pollIv.current = null;
    }
  }, []);

  /** Terapkan sesi login dari hasil approve (tanpa membuat user ganda) */
  const applySession = useCallback(
    (user: PublicUser) => {
      saveSession({ address: user.walletAddress, walletName: "Binance Agent Wallet", loginAt: Date.now() });
      setUser(user);
      onClose();
    },
    [setUser, onClose]
  );

  /** Approve dari perangkat yang sama (tombol Confirm) — lewat API agar sesi sama */
  const approveHere = useCallback(async () => {
    if (!pairCodeRef.current) return;
    setPhase("confirming");
    setError(null);
    try {
      const res = await fetch("/api/pair/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairCodeRef.current }),
      });
      const d = await res.json();
      if (!res.ok || !d?.ok) {
        if (res.status === 410) {
          setPhase("expired");
        } else {
          setError(d?.error ?? t("errLogin"));
          setPhase("connecting");
        }
        return;
      }
      await new Promise((r) => setTimeout(r, 1200)); // animasi konfirmasi singkat
      applySession(d.user);
    } catch {
      if (mounted.current) {
        setError(t("errLogin"));
        setPhase("connecting");
      }
    }
  }, [applySession, t]);

  const startPolling = useCallback(() => {
    stopPoll();
    pollIv.current = setInterval(async () => {
      if (!pairCodeRef.current) return;
      try {
        const res = await fetch(`/api/pair/status?code=${pairCodeRef.current}`);
        const d = await res.json();
        if (!mounted.current) return;
        if (d?.status === "APPROVED" && d?.user) {
          stopPoll();
          applySession(d.user);
        } else if (d?.status === "EXPIRED" || d?.status === "NOT_FOUND") {
          stopPoll();
          setPhase("expired");
        }
      } catch {
        /* jaringan sempat gagal → coba di tick berikutnya */
      }
    }, POLL_MS);
  }, [applySession, stopPoll]);

  const regenPair = useCallback(() => {
    const code = newPairingCode();
    pairCodeRef.current = code;
    setPairCode(code);
    setPairUrl(`${window.location.origin}/pair/${code}`);
    setSecsLeft(PAIR_TTL);
    setQrData("");
    setPhase("connecting");
    setError(null);
    // daftarkan sesi ke server (dengan referral bila ada)
    fetch("/api/pair/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, refCode: refCode ?? undefined }),
    })
      .then(() => {
        startPolling();
      })
      .catch(() => {
        startPolling(); // tetap polling; approve tanpa create → NOT_FOUND → expired
      });
  }, [refCode, startPolling]);

  // Reset tiap kali modal dibuka
  useEffect(() => {
    if (!open) return;
    mounted.current = true;
    setShowBrowser(false);
    setOptions([]);
    setCopiedPair(false);
    regenPair();
    // deteksi wallet browser secara diam-diam untuk fallback
    getWalletOptions()
      .then((opts) => {
        if (mounted.current) setOptions(opts);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
      stopPoll();
    };
  }, [open, regenPair, stopPoll]);

  // Countdown 300s → expired (server TTL sama)
  useEffect(() => {
    if (!open || phase !== "connecting") return;
    const iv = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          stopPoll();
          if (mounted.current) setPhase("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [open, phase, pairCode, stopPoll]);

  // Render QR ke data URL
  useEffect(() => {
    if (!open || !pairUrl) return;
    QRCode.toDataURL(pairUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0B0E11", light: "#FFFFFF" },
    })
      .then((url) => {
        if (mounted.current) setQrData(url);
      })
      .catch(() => {});
  }, [open, pairUrl]);

  const handleBrowserWallet = useCallback(
    async (opt: WalletOption) => {
      if (!opt.provider) return;
      setConnecting(opt.id);
      setError(null);
      try {
        const address = await connectProvider(opt.provider);
        if (!isValidEvmAddress(address)) throw new Error("invalid address");
        const res = await api.login(address.toLowerCase(), refCode ?? undefined);
        saveSession({ address: res.user.walletAddress, walletName: opt.name, loginAt: Date.now() });
        setUser(res.user);
        onClose();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes("user rejected") || err.message.includes("denied")
              ? t("errUserRejected")
              : err.message
            : t("errConnect");
        setError(msg);
      } finally {
        if (mounted.current) setConnecting(null);
      }
    },
    [refCode, setUser, onClose, t]
  );

  const copyPair = async () => {
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopiedPair(true);
      setTimeout(() => setCopiedPair(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const mmss = `${String(Math.floor(secsLeft / 60)).padStart(2, "0")}:${String(secsLeft % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-[#2B3139] bg-[#181A20] text-[#EAECEF] p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[#2B3139] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0B90B] text-[#0B0E11]">
              <Wallet className="h-4.5 w-4.5" />
            </span>
            {t("agentWalletTitle")}
          </DialogTitle>
          {/* Status badge */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              phase === "confirming"
                ? "bg-[#20B26C]/15 text-[#20B26C]"
                : phase === "expired"
                  ? "bg-[#F6465D]/15 text-[#F6465D]"
                  : "bg-[#F0B90B]/15 text-[#F0B90B]"
            }`}
          >
            {phase === "confirming" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20B26C] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20B26C]" />
                </span>
                {t("connected")}
              </>
            ) : phase === "expired" ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                {t("expiredBadge")}
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F0B90B] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F0B90B]" />
                </span>
                {t("connectStatus")}
              </>
            )}
          </span>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {phase === "confirming" ? (
            /* ── Fase konfirmasi ── */
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="relative">
                <div className="absolute -inset-3 animate-pulse rounded-full bg-[#20B26C]/20 blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#20B26C]/60 bg-[#20B26C]/10">
                  <ShieldCheck className="h-10 w-10 text-[#20B26C]" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-base font-bold">{t("confirmingInApp")}</p>
                <p className="mt-1 text-xs text-[#848E9C]">{t("agentIdNote")}</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-[#F0B90B]" />
            </div>
          ) : (
            /* ── Fase connecting / expired: tampilan QR ── */
            <>
              <p className="text-center text-[13px] leading-relaxed text-[#848E9C]">
                {t("qrSubtitle")}
              </p>

              {/* Kartu QR */}
              <div className="mt-4 flex flex-col items-center">
                <div className="relative rounded-2xl bg-gradient-to-br from-[#F8D33A]/60 via-[#F0B90B]/30 to-[#A855F7]/30 p-[3px] shadow-[0_10px_40px_-10px_rgba(240,185,11,0.35)]">
                  <div className="rounded-2xl bg-white p-3">
                    {qrData ? (
                      <img
                        src={qrData}
                        alt="Agent Wallet pairing QR"
                        className={`h-44 w-44 transition-opacity ${phase === "expired" ? "opacity-20" : ""}`}
                      />
                    ) : (
                      <div className="flex h-44 w-44 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
                      </div>
                    )}
                  </div>
                  {phase === "expired" && (
                    <button
                      onClick={regenPair}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#0B0E11]/80"
                    >
                      <RefreshCw className="h-6 w-6 text-[#F0B90B]" />
                      <span className="text-xs font-semibold text-[#EAECEF]">{t("refreshCode")}</span>
                    </button>
                  )}
                </div>

                {/* Pairing code */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-[#848E9C]">{t("pairingCode")}</span>
                  <button
                    onClick={copyPair}
                    className="flex items-center gap-1.5 rounded-lg border border-[#F0B90B]/40 bg-[#F0B90B]/10 px-3 py-1 font-mono text-sm font-bold tracking-[0.3em] text-[#F0B90B] transition-colors hover:bg-[#F0B90B]/20"
                    aria-label="Salin pairing code"
                  >
                    {pairCode}
                    {copiedPair ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
                  </button>
                  <button
                    onClick={regenPair}
                    className="rounded-lg p-1.5 text-[#848E9C] transition-colors hover:bg-[#1E2329] hover:text-[#EAECEF]"
                    aria-label="Refresh pairing code"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 max-w-xs text-center text-[11px] leading-relaxed text-[#848E9C]">
                  {t("scanHint")}
                </p>
              </div>

              {/* Buka halaman pairing (jadi juga untuk "scan" di perangkat yang sama) */}
              <a
                href={pairUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F0B90B]/40 bg-[#F0B90B]/10 text-sm font-bold text-[#F0B90B] transition-colors hover:bg-[#F0B90B]/20"
              >
                <ExternalLink className="h-4 w-4" />
                {t("openPairing")}
              </a>

              {/* Status menunggu */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#2B3139] bg-[#0B0E11] px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-[#848E9C]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F0B90B]" />
                  {phase === "expired" ? t("codeExpired") : t("waitingConfirm")}
                </span>
                <span className={`font-mono text-xs tabular-nums ${phase === "expired" ? "text-[#F6465D]" : "text-[#EAECEF]"}`}>
                  {phase === "expired" ? "00:00" : mmss}
                </span>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3 text-xs text-[#F6465D]">
                  {error}
                </div>
              )}

              {/* Tombol aksi */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="h-11 rounded-xl border border-[#2B3139] text-sm text-[#848E9C] hover:bg-[#1E2329] hover:text-[#EAECEF]"
                >
                  {t("cancelConnect")}
                </Button>
                <Button
                  onClick={approveHere}
                  disabled={phase === "expired"}
                  className="h-11 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] text-sm font-extrabold text-[#0B0E11] hover:opacity-90 disabled:opacity-40"
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  {t("simulateConfirm")}
                </Button>
              </div>

              {/* Fallback: wallet browser / alamat manual */}
              <button
                onClick={() => setShowBrowser((v) => !v)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-[#848E9C] transition-colors hover:text-[#EAECEF]"
              >
                <Keyboard className="h-3.5 w-3.5" />
                {t("useBrowserWallet")}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showBrowser ? "rotate-180" : ""}`} />
              </button>

              {showBrowser && (
                <div className="mt-3 space-y-2">
                  {options.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[#2B3139] p-3 text-center text-xs text-[#848E9C]">
                      {t("noWallet")}
                    </p>
                  )}
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleBrowserWallet(opt)}
                      disabled={connecting !== null}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
                        opt.isBinance
                          ? "border-[#F0B90B]/50 bg-[#F0B90B]/10 hover:bg-[#F0B90B]/15"
                          : "border-[#2B3139] bg-[#0B0E11] hover:bg-[#1E2329]"
                      }`}
                    >
                      {opt.icon ? (
                        <img src={opt.icon} alt={opt.name} className="h-8 w-8 rounded-lg" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E2329] text-[#848E9C]">
                          <Wallet className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{opt.name}</p>
                        <p className="truncate text-[11px] text-[#848E9C]">
                          {opt.isBinance ? "Agentic Wallet • BNB Chain" : t("walletDetected")}
                        </p>
                      </div>
                      {connecting === opt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#F0B90B]" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-[#20B26C]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-[#2B3139] px-5 py-3 text-[10px] leading-relaxed text-[#848E9C]">
          {t("qrFooter")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
