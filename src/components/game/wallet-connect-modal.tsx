"use client";

// ============================================
// AGENTIC MINER — Agent Wallet Connect (ala ptah.trade)
// METODE 1 (utama): SDK PARTNER RESMI Binance
//   @binance/w3w-ethereum-provider + @binance/w3w-utils
//   • QR = URI WalletConnect ASLI dari relay Binance (event `uri_ready`)
//   • Tombol "Open Binance sign-in" = deep link resmi (openBinanceDeepLink)
//   • Akun nyata dari Binance Web3 Wallet → login ke game
// METODE 2: Pairing link server (/api/pair/*) — scan kamera mana pun
// FALLBACK: wallet browser (EIP-6963 / injected Binance)
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
  Smartphone,
  BadgeCheck,
} from "lucide-react";
import {
  connectProvider,
  getWalletOptions,
  saveSession,
  type WalletOption,
  type EIP1193Provider,
} from "@/lib/wallet";
import "@/lib/polyfill-buffer"; // Buffer/process global untuk SDK resmi Binance
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { isValidEvmAddress } from "@/lib/game-config";
import type { PublicUser } from "@/lib/types";

const PAIR_TTL = 300; // detik — sama seperti ptah.trade
const POLL_MS = 2500;
const SDK_URI_TIMEOUT = 20_000; // batas tunggu URI dari relay Binance

interface Props {
  open: boolean;
  onClose: () => void;
  refCode?: string | null;
}

type Method = "binance" | "pair";
type Phase = "connecting" | "confirming" | "expired"; // alur pairing server
type SdkStatus = "loading" | "waiting" | "approving" | "failed"; // alur SDK Binance

type W3WProvider = any;

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

  // ── metode aktif ──
  const [method, setMethod] = useState<Method>("binance");

  // ── alur SDK Binance (real pairing) ──
  const [sdkStatus, setSdkStatus] = useState<SdkStatus>("loading");
  const [wcUri, setWcUri] = useState("");
  const [sdkErr, setSdkErr] = useState<string | null>(null);
  const providerRef = useRef<W3WProvider>(null);
  const enablingRef = useRef(false);
  const binanceCancelled = useRef(false);
  const uriTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── alur pairing server ──
  const [phase, setPhase] = useState<Phase>("connecting");
  const [pairCode, setPairCode] = useState("");
  const [pairUrl, setPairUrl] = useState("");
  const [secsLeft, setSecsLeft] = useState(PAIR_TTL);
  const [copiedPair, setCopiedPair] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── QR bersama ──
  const [qrData, setQrData] = useState("");

  // fallback wallet browser (EIP-6963 / injected)
  const [showBrowser, setShowBrowser] = useState(false);
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const mounted = useRef(true);
  const pollIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const pairCodeRef = useRef("");

  // Pesan i18n terbaru untuk closure SDK (t tidak stabil antar render)
  const ERR_REJECTED = useRef("");
  const ERR_SDK = useRef("");
  useEffect(() => {
    ERR_REJECTED.current = t("errUserRejected");
    ERR_SDK.current = t("sdkFailed");
  });

  const stopPoll = useCallback(() => {
    if (pollIv.current) {
      clearInterval(pollIv.current);
      pollIv.current = null;
    }
  }, []);

  const renderQr = useCallback((payload: string) => {
    QRCode.toDataURL(payload, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0B0E11", light: "#FFFFFF" },
    })
      .then((url) => {
        if (mounted.current) setQrData(url);
      })
      .catch(() => {});
  }, []);

  // ══════════════════════════════════════════
  //  METODE 1 — SDK PARTNER RESMI BINANCE
  // ══════════════════════════════════════════

  const handleBinanceAccounts = useCallback(
    async (accs: string[]) => {
      const addr = accs?.[0];
      if (!addr || !isValidEvmAddress(addr)) return;
      if (!mounted.current || binanceCancelled.current) return;
      setSdkStatus("approving");
      try {
        const res = await api.login(addr.toLowerCase(), refCode ?? undefined);
        if (!mounted.current) return;
        saveSession({
          address: res.user.walletAddress,
          walletName: "Binance Web3 Wallet",
          loginAt: Date.now(),
        });
        setUser(res.user);
        onClose();
      } catch {
        if (mounted.current) {
          setSdkStatus("failed");
          setSdkErr(t("errLogin"));
        }
      }
    },
    [refCode, setUser, onClose, t]
  );

  const clearUriTimer = useCallback(() => {
    if (uriTimerRef.current) {
      clearTimeout(uriTimerRef.current);
      uriTimerRef.current = null;
    }
  }, []);

  const startBinance = useCallback(async () => {
    if (typeof window === "undefined") return;
    binanceCancelled.current = false;
    setSdkStatus("loading");
    setWcUri("");
    setQrData("");
    setSdkErr(null);

    try {
      const w = window as unknown as {
        binancew3w?: { ethereum?: EIP1193Provider };
        ethereum?: EIP1193Provider & { isBinance?: boolean };
      };

      // 1) Di dalam dApp browser Binance App → injected provider resmi
      const injected = w.binancew3w?.ethereum ?? (w.ethereum?.isBinance ? w.ethereum : null);
      if (injected) {
        const accs = (await injected.request({ method: "eth_requestAccounts" })) as string[];
        await handleBinanceAccounts(accs);
        return;
      }

      // 2) SDK partner resmi Binance (QR WalletConnect asli via relay Binance)
      const { getProvider } = await import("@binance/w3w-ethereum-provider");
      if (binanceCancelled.current || !mounted.current) return;

      if (!providerRef.current) {
        const p: W3WProvider = getProvider({ chainId: 56, showQrCodeModal: false });
        providerRef.current = p;

        p.on("uri_ready", (uri: string) => {
          if (binanceCancelled.current || !mounted.current) return;
          clearUriTimer();
          setWcUri(uri);
          renderQr(uri);
          setSdkStatus("waiting");
        });
        p.on("accountsChanged", (accs: string[]) => {
          if (!binanceCancelled.current && accs?.length) handleBinanceAccounts(accs);
        });
        p.on("disconnect", () => {
          if (mounted.current && !binanceCancelled.current) {
            enablingRef.current = false;
            setWcUri("");
            setQrData("");
            setSdkStatus("loading");
          }
        });
      }

      const p = providerRef.current;

      // Sudah terhubung sebelumnya (singleton SDK) → langsung masuk
      if (p.connected && p.accounts?.length) {
        await handleBinanceAccounts(p.accounts as string[]);
        return;
      }

      setSdkStatus("waiting");
      clearUriTimer();
      uriTimerRef.current = setTimeout(() => {
        if (!mounted.current || binanceCancelled.current) return;
        if (!wcUri && !providerRef.current?.connected) {
          setSdkStatus("failed");
          setSdkErr(t("sdkFailed"));
        }
      }, SDK_URI_TIMEOUT);

      // enable() menunggu persetujuan di Binance App (scan QR / deep link).
      // Jika sesi pending dari bukaan modal sebelumnya masih berjalan,
      // jangan panggil enable() dua kali — promise lama tetap memantau.
      if (!enablingRef.current) {
        enablingRef.current = true;
        p.enable()
          .then((accs: string[]) => {
            enablingRef.current = false;
            clearUriTimer();
            if (!binanceCancelled.current) handleBinanceAccounts(accs);
          })
          .catch((err: unknown) => {
            enablingRef.current = false;
            clearUriTimer();
            if (binanceCancelled.current || !mounted.current) return;
            const msg = err instanceof Error ? err.message : "";
            setSdkStatus("failed");
            setSdkErr(/reject|denied/i.test(msg) ? ERR_REJECTED.current : ERR_SDK.current);
          });
      }
    } catch {
      if (!binanceCancelled.current && mounted.current) {
        setSdkStatus("failed");
        setSdkErr(t("sdkFailed"));
      }
    }
  }, [clearUriTimer, handleBinanceAccounts, renderQr, t]);

  /** Tombol "Open Binance sign-in" — deep link resmi dari @binance/w3w-utils */
  const openBinanceApp = useCallback(async () => {
    if (!wcUri) return;
    try {
      const { openBinanceDeepLink } = await import("@binance/w3w-utils");
      openBinanceDeepLink(wcUri);
    } catch {
      /* noop */
    }
  }, [wcUri]);

  // ══════════════════════════════════════════
  //  METODE 2 — PAIRING LINK SERVER
  // ══════════════════════════════════════════

  /** Terapkan sesi login dari hasil approve (tanpa membuat user ganda) */
  const applySession = useCallback(
    (user: PublicUser) => {
      saveSession({
        address: user.walletAddress,
        walletName: "Binance Agent Wallet",
        loginAt: Date.now(),
      });
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

  // ── ganti metode ──
  // Ref ke fungsi terbaru (identitas stabil) agar effect buka-modal
  // tidak re-run akibat fungsi baru tiap render (t tidak stabil).
  const latestRef = useRef({ startBinance, regenPair, stopPoll, clearUriTimer });
  useEffect(() => {
    latestRef.current = { startBinance, regenPair, stopPoll, clearUriTimer };
  });

  const switchMethod = useCallback(
    (m: Method) => {
      if (m === method) return;
      setMethod(m);
      setError(null);
      setQrData("");
      if (m === "pair") {
        binanceCancelled.current = true; // hentikan alur SDK
        latestRef.current.clearUriTimer();
        latestRef.current.regenPair();
      } else {
        latestRef.current.stopPoll();
        latestRef.current.startBinance();
      }
    },
    [method]
  );

  // Reset tiap kali modal dibuka (HANYA saat `open` berubah)
  useEffect(() => {
    if (!open) return;
    mounted.current = true;
    setShowBrowser(false);
    setOptions([]);
    setCopiedPair(false);
    setMethod("binance");
    latestRef.current.startBinance();
    // deteksi wallet browser secara diam-diam untuk fallback
    getWalletOptions()
      .then((opts) => {
        if (mounted.current) setOptions(opts);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
      binanceCancelled.current = true;
      latestRef.current.clearUriTimer();
      latestRef.current.stopPoll();
    };
  }, [open]);

  // Countdown 300s → expired (hanya alur pairing server)
  useEffect(() => {
    if (!open || method !== "pair" || phase !== "connecting") return;
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
  }, [open, method, phase, pairCode, stopPoll]);

  // QR alur pairing (URL /pair/{code})
  useEffect(() => {
    if (!open || method !== "pair" || !pairUrl) return;
    renderQr(pairUrl);
  }, [open, method, pairUrl, renderQr]);

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

  // status badge global
  const busy =
    (method === "binance" && (sdkStatus === "approving" || (sdkStatus === "waiting" && phase === "confirming"))) ||
    (method === "pair" && phase === "confirming");
  const expired = (method === "binance" && sdkStatus === "failed") || (method === "pair" && phase === "expired");

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
              busy
                ? "bg-[#20B26C]/15 text-[#20B26C]"
                : expired
                  ? "bg-[#F6465D]/15 text-[#F6465D]"
                  : "bg-[#F0B90B]/15 text-[#F0B90B]"
            }`}
          >
            {busy ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20B26C] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20B26C]" />
                </span>
                {t("connected")}
              </>
            ) : expired ? (
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

        {/* ── Pemilih metode ── */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#0B0E11] p-1">
            <button
              onClick={() => switchMethod("binance")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                method === "binance"
                  ? "bg-[#F0B90B] text-[#0B0E11]"
                  : "text-[#848E9C] hover:text-[#EAECEF]"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              {t("methodBinance")}
            </button>
            <button
              onClick={() => switchMethod("pair")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                method === "pair" ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#848E9C] hover:text-[#EAECEF]"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("methodPair")}
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-5 py-5">
          {method === "binance" ? (
            /* ════════ METODE 1: SDK RESMI BINANCE ════════ */
            <>
              <p className="text-center text-[13px] leading-relaxed text-[#848E9C]">{t("binanceQrHint")}</p>

              <div className="mt-4 flex flex-col items-center">
                <div className="relative rounded-2xl bg-gradient-to-br from-[#F8D33A]/60 via-[#F0B90B]/30 to-[#A855F7]/30 p-[3px] shadow-[0_10px_40px_-10px_rgba(240,185,11,0.35)]">
                  <div className="rounded-2xl bg-white p-3">
                    {sdkStatus === "failed" ? (
                      <button
                        onClick={startBinance}
                        className="flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-xl bg-[#FFF6DE]"
                      >
                        <RefreshCw className="h-6 w-6 text-[#F0B90B]" />
                        <span className="text-xs font-semibold text-[#0B0E11]">{t("retry")}</span>
                      </button>
                    ) : qrData ? (
                      <img src={qrData} alt="Binance sign-in QR" className="h-44 w-44" />
                    ) : (
                      <div className="flex h-44 w-44 flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
                        <span className="px-3 text-center text-[10px] leading-snug text-[#848E9C]">
                          {t("sdkWaiting")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deep link resmi Binance */}
                <button
                  onClick={openBinanceApp}
                  disabled={!wcUri}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] text-sm font-extrabold text-[#0B0E11] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Smartphone className="h-4 w-4" />
                  {t("openBinance")}
                </button>

                <p className="mt-3 max-w-xs text-center text-[11px] leading-relaxed text-[#848E9C]">
                  {t("agentIdNote")}
                </p>

                <div className="mt-4 flex items-center gap-1.5 rounded-full border border-[#2B3139] bg-[#0B0E11] px-3 py-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#20B26C]" />
                  <span className="text-[10px] font-medium text-[#848E9C]">{t("poweredBySdk")}</span>
                </div>
              </div>

              {sdkErr && sdkStatus === "failed" && (
                <div className="mt-3 rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3 text-xs text-[#F6465D]">
                  {sdkErr}
                </div>
              )}
            </>
          ) : (
            /* ════════ METODE 2: PAIRING LINK SERVER ════════ */
            <>
              <p className="text-center text-[13px] leading-relaxed text-[#848E9C]">{t("qrSubtitle")}</p>

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
                <span
                  className={`font-mono text-xs tabular-nums ${phase === "expired" ? "text-[#F6465D]" : "text-[#EAECEF]"}`}
                >
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
            </>
          )}

          {/* Fallback: wallet browser (kedua metode) */}
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
        </div>

        <div className="border-t border-[#2B3139] px-5 py-3 text-[10px] leading-relaxed text-[#848E9C]">
          {t("qrFooter")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
