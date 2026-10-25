"use client";

// ============================================
// AGENTIC MINER — Agent Wallet Connect (ala ptah.trade, dibuat ulang)
// METODE UTAMA: "Sign in to my Agentic Wallet"
//   Server menjalankan CLI resmi Binance `baw` (@binance/agentic-wallet):
//   POST /api/agentic/start → QR ASLI https://app.binance.com/uni-qr/XXX + pairing code
//   GET  /api/agentic/poll  → WAITING / SUCCESS / EXPIRED
//   User scan QR dengan Binance App → "Masuk ke Agentic Wallet" → konfirmasi pairing code
//   → sesi Agentic Wallet tersambung ke server → login game.
// METODE KEDUA: "Use a regular wallet" — wallet browser via EIP-6963.
// LOGOUT → POST /api/agentic/signout (`baw auth signout`) → login berikutnya WAJIB sign ulang.
// Terbuka untuk semua wallet — tanpa gate NFT / whitelist.
// ============================================

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Wallet,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Info,
  X,
} from "lucide-react";
import {
  connectProvider,
  getWalletOptions,
  saveSession,
  type WalletOption,
} from "@/lib/wallet";
import { api, type AgenticStartData } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { PublicUser } from "@/lib/types";

type View = "idle" | "starting" | "connecting";
type Badge = "notConnected" | "connecting" | "connected";

type StartData = AgenticStartData;

const POLL_MS = 2500;

export default function WalletConnectModal({
  open,
  onClose,
  refCode,
}: {
  open: boolean;
  onClose: () => void;
  refCode?: string | null;
}) {
  const setUser = useGameStore((s) => s.setUser);
  const { t } = useT();

  const [view, setView] = useState<View>("idle");
  const [badge, setBadge] = useState<Badge>("notConnected");
  const [start, setStart] = useState<StartData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const [err, setErr] = useState<{ msg: string; address?: string } | null>(null);
  const [qrData, setQrData] = useState("");
  const [copied, setCopied] = useState(false);

  // Regular wallet (EIP-6963)
  const [showWallets, setShowWallets] = useState(false);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [busyWallet, setBusyWallet] = useState<string | null>(null);

  // refs untuk menahan nilai terkini di dalam callback/effect stabil
  const startRef = useRef<StartData | null>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const refCodeRef = useRef(refCode);
  refCodeRef.current = refCode;

  const stopPoll = useCallback(() => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);
  const pollTimer = useRef<number | null>(null);

  const reset = useCallback(() => {
    stopPoll();
    startRef.current = null;
    setStart(null);
    setQrData("");
    setSecondsLeft(0);
    setExpired(false);
    setView("idle");
    setBadge("notConnected");
  }, [stopPoll]);

  // Selesaikan login di client
  const finishLogin = useCallback(
    (user: PublicUser, address: string) => {
      stopPoll();
      saveSession({ address, walletName: "Agent Wallet", loginAt: Date.now() });
      setBadge("connected");
      setUser(user);
      window.setTimeout(() => {
        reset();
        onClose();
      }, 450);
    },
    [onClose, reset, setUser, stopPoll]
  );

  // ── Polling status sign-in Agentic Wallet ──
  useEffect(() => {
    if (!open || view !== "connecting") return;
    let alive = true;

    const tick = async () => {
      const s = startRef.current;
      if (!s) return;
      try {
        const res = await fetch(`/api/agentic/poll?qrCodeId=${encodeURIComponent(s.qrCodeId)}`);
        const d = (await res.json()) as
          | { status: "WAITING"; secondsLeft: number }
          | { status: "EXPIRED" }
          | { status: "SUCCESS"; user: PublicUser; address: string };
        if (!alive) return;
        if (d.status === "WAITING") {
          setSecondsLeft((prev) => (d.secondsLeft > 0 ? d.secondsLeft : prev));
        } else if (d.status === "SUCCESS") {
          finishLogin(d.user, d.address);
        } else {
          stopPoll();
          setExpired(true);
        }
      } catch {
        /* jaringan flip → coba poll berikutnya */
      }
    };

    const timer = window.setInterval(tick, POLL_MS);
    pollTimer.current = timer;
    void tick();
    return () => {
      alive = false;
      window.clearInterval(timer);
      pollTimer.current = null;
    };
  }, [open, view, finishLogin, stopPoll]);

  // ── Countdown lokal dari expireAt ──
  useEffect(() => {
    if (!open || view !== "connecting" || !start) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.floor((start.expireAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        stopPoll();
        setExpired(true);
      }
    }, 1000);
    setSecondsLeft(Math.max(0, Math.floor((start.expireAt - Date.now()) / 1000)));
    return () => window.clearInterval(id);
  }, [open, view, start, stopPoll]);

  // ── Render QR — PRIORITAS: qrDataUrl dari SERVER (instan, tahan browser/proxy
  // bermasalah); fallback: render lokal via qrcode hanya bila server tidak kirim. ──
  useEffect(() => {
    if (!open || view !== "connecting" || !start) return;
    if (start.qrDataUrl) {
      setQrData(start.qrDataUrl);
      return;
    }
    if (!start.urlForWeb) return;
    let alive = true;
    QRCode.toDataURL(start.urlForWeb, {
      width: 460,
      margin: 1,
      color: { dark: "#0B0E11", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (alive) setQrData(url);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, view, start]);

  // Reset saat modal ditutup
  useEffect(() => {
    if (!open) {
      stopPoll();
      const id = window.setTimeout(() => {
        startRef.current = null;
        setStart(null);
        setQrData("");
        setExpired(false);
        setErr(null);
        setView("idle");
        setBadge("notConnected");
        setShowWallets(false);
      }, 200);
      return () => window.clearTimeout(id);
    }
  }, [open, stopPoll]);

  // ── Mulai sign-in Agentic Wallet ──
  const handleAgenticSignIn = useCallback(async () => {
    setErr(null);
    setExpired(false);
    setView("starting");
    setBadge("connecting");
    try {
      // api.agenticStart sudah tangguh: POST → GET fallback → POST ulang
      const d = await api.agenticStart(refCodeRef.current ?? null);
      if (d.alreadyConnected && d.user && d.address) {
        // Sesi Agentic Wallet di server masih hidup → langsung masuk tanpa QR
        finishLogin(d.user, d.address);
        return;
      }
      const data: StartData = {
        qrCodeId: d.qrCodeId,
        urlForWeb: d.urlForWeb,
        pairingCode: d.pairingCode,
        expireAt: d.expireAt,
        secondsLeft: d.secondsLeft,
      };
      startRef.current = data;
      setStart(data);
      setSecondsLeft(data.secondsLeft);
      setView("connecting");
    } catch {
      setErr({ msg: tRef.current("sdkFailed") });
      setView("idle");
      setBadge("notConnected");
    }
  }, [finishLogin]);

  // ── Regular wallet: daftar opsi EIP-6963 ──
  const loadWallets = useCallback(async () => {
    setShowWallets(true);
    if (wallets.length === 0) {
      const opts = await getWalletOptions();
      setWallets(opts);
    }
  }, [wallets.length]);

  // ── Regular wallet: connect + login ──
  const handleWalletPick = useCallback(
    async (opt: WalletOption) => {
      if (!opt.provider) return;
      setBusyWallet(opt.id);
      setErr(null);
      try {
        const address = await connectProvider(opt.provider);
        setBadge("connecting");
        try {
          const r = await api.login(address, refCodeRef.current ?? undefined);
          finishLogin(r.user, address);
        } catch {
          setErr({ msg: tRef.current("errLogin"), address });
        }
      } catch (e) {
        const msg = (e as Error)?.message ?? "";
        setErr({ msg: /reject|deny|ditolak/i.test(msg) ? tRef.current("errUserRejected") : tRef.current("errConnect") });
      } finally {
        setBusyWallet(null);
        setBadge("notConnected");
      }
    },
    [finishLogin]
  );

  const copyPairing = useCallback(async () => {
    if (!start?.pairingCode) return;
    try {
      await navigator.clipboard.writeText(start.pairingCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [start?.pairingCode]);

  const busy = view === "starting";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-[400px] gap-0 overflow-hidden rounded-2xl border-[#2B3139] bg-[#181A20] p-0">
        {/* ── Header: ikon wallet + judul + badge status (ala ptah.trade) ── */}
        <div className="flex items-center gap-3 border-b border-[#2B3139] px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0B90B]/40 bg-[#0B0E11]">
            <Wallet className="h-5 w-5 text-[#F0B90B]" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-bold text-[#EAECEF]">{t("agentWalletTitle")}</DialogTitle>
            <p className="text-[11px] text-[#848E9C]">Binance Agentic Wallet</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              badge === "connected"
                ? "bg-[#20B26C]/15 text-[#20B26C]"
                : badge === "connecting"
                  ? "animate-pulse bg-[#F0B90B]/15 text-[#F0B90B]"
                  : "bg-[#F0B90B]/10 text-[#F0B90B]"
            }`}
          >
            {badge === "connected" ? t("connected") : badge === "connecting" ? t("connectStatus") : t("notConnected")}
          </span>
          {/* Tutup memakai tombol bawaan DialogContent (pojok kanan atas) */}
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5">
          {/* ── Pesan error ── */}
          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-[#F6465D]/30 bg-[#F6465D]/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F6465D]" />
              <div className="min-w-0">
                <p className="text-[11px] leading-relaxed text-[#F6465D]">{err.msg}</p>
                {err.address && (
                  <p className="mt-1 break-all font-mono text-[10px] text-[#848E9C]">{err.address}</p>
                )}
              </div>
              <button onClick={() => setErr(null)} className="ml-auto shrink-0 text-[#848E9C] hover:text-[#EAECEF]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {view === "connecting" && start ? (
            /* ════ TAMPILAN CONNECTING: QR uni-qr + pairing code ════ */
            <div className="space-y-4">
              <p className="text-center text-[13px] leading-relaxed text-[#848E9C]">{t("qrSubtitle")}</p>

              {/* Kartu QR */}
              <div className="relative mx-auto w-fit rounded-2xl border border-[#F0B90B]/40 bg-[#0B0E11] p-3">
                {qrData ? (
                  <img
                    src={qrData}
                    alt="Binance Agentic Wallet sign-in QR"
                    className="h-[200px] w-[200px] rounded-lg"
                  />
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-[#181A20]">
                    <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
                  </div>
                )}
                {expired && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#0B0E11]/95">
                    <p className="px-4 text-center text-xs font-semibold text-[#EAECEF]">{t("codeExpired")}</p>
                    <Button
                      onClick={handleAgenticSignIn}
                      className="h-9 rounded-full bg-[#F0B90B] px-4 text-xs font-bold text-[#0B0E11] hover:bg-[#F8D33A]"
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      {t("refreshCode")}
                    </Button>
                  </div>
                )}
              </div>

              {/* Pairing code */}
              <div className="flex items-center justify-between rounded-xl border border-[#2B3139] bg-[#0B0E11] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#848E9C]">{t("pairingCode")}</p>
                  <p className="font-mono text-lg font-bold tracking-[0.2em] text-[#F0B90B]">{start.pairingCode}</p>
                </div>
                <button
                  onClick={copyPairing}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-[#2B3139] px-2.5 py-1.5 text-[10px] text-[#848E9C] transition-colors hover:text-[#EAECEF]"
                  aria-label="Salin pairing code"
                >
                  {copied ? <Check className="h-3 w-3 text-[#20B26C]" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              <p className="text-center text-[11px] leading-relaxed text-[#848E9C]">{t("scanHint")}</p>

              {/* Open Binance sign-in — link uni-qr ASLI dari server (verbatim) */}
              <a
                href={start.urlForWeb}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] text-sm font-extrabold text-[#0B0E11] transition-opacity hover:opacity-90"
              >
                {t("openBinance")}
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Waiting + countdown */}
              <div className="flex items-center justify-center gap-2 text-xs text-[#848E9C]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F0B90B]" />
                <span>
                  {expired ? t("codeExpired") : t("waitingConfirm")} ·{" "}
                  <span className="tabular-nums">{expired ? 0 : secondsLeft}s</span>
                </span>
              </div>

              <button
                onClick={reset}
                className="w-full rounded-xl border border-[#2B3139] py-2.5 text-xs font-semibold text-[#848E9C] transition-colors hover:text-[#EAECEF]"
              >
                {t("cancelConnect")}
              </button>
            </div>
          ) : (
            /* ════ TAMPILAN IDLE: tombol utama + regular wallet ════ */
            <div className="space-y-4">
              <p className="text-center text-[13px] leading-relaxed text-[#848E9C]">{t("qrSubtitle")}</p>

              {/* Tombol utama — Sign in to my Agentic Wallet */}
              <Button
                onClick={handleAgenticSignIn}
                disabled={busy}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] text-sm font-extrabold text-[#0B0E11] shadow-[0_6px_24px_rgba(240,185,11,0.25)] transition-opacity hover:opacity-90"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("startingSignIn")}
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    {t("signInAgentic")}
                  </>
                )}
              </Button>

              <p className="text-center text-[11px] text-[#848E9C]">{t("agentIdNote")}</p>

              {/* Divider + Use a regular wallet */}
              <div className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-[#2B3139]" />
                <span className="text-[10px] uppercase tracking-wider text-[#5E6673]">{t("orDivider")}</span>
                <span className="h-px flex-1 bg-[#2B3139]" />
              </div>

              {!showWallets ? (
                <button
                  onClick={loadWallets}
                  className="mx-auto block text-xs font-semibold text-[#F0B90B] underline underline-offset-4 transition-opacity hover:opacity-80"
                >
                  {t("useRegularWallet")}
                </button>
              ) : (
                <div className="space-y-2">
                  {wallets.length === 0 ? (
                    <p className="flex items-start gap-2 rounded-xl border border-[#2B3139] bg-[#0B0E11] p-3 text-[11px] leading-relaxed text-[#848E9C]">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F0B90B]" />
                      {t("noWallet")}
                    </p>
                  ) : (
                    wallets.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleWalletPick(opt)}
                        disabled={busyWallet !== null}
                        className="flex w-full items-center gap-3 rounded-xl border border-[#2B3139] bg-[#0B0E11] p-3 text-left transition-colors hover:border-[#F0B90B]/50 disabled:opacity-50"
                      >
                        {opt.icon ? (
                          <img src={opt.icon} alt={opt.name} className="h-8 w-8 rounded-lg" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181A20]">
                            <Wallet className="h-4 w-4 text-[#F0B90B]" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#EAECEF]">{opt.name}</span>
                          <span className="block text-[10px] text-[#848E9C]">
                            {opt.isBinance ? "Binance Wallet • BNB Chain" : t("walletDetected")}
                          </span>
                        </span>
                        {busyWallet === opt.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#F0B90B]" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#5E6673]" />
                        )}
                      </button>
                    ))
                  )}
                  <button
                    onClick={() => setShowWallets(false)}
                    className="mx-auto block text-[11px] font-semibold text-[#848E9C] underline underline-offset-4 hover:text-[#EAECEF]"
                  >
                    {t("backToAgent")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer disclaimer */}
          <p className="border-t border-[#2B3139]/60 pt-3 text-center text-[10px] leading-relaxed text-[#5E6673]">
            {t("qrFooter")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
