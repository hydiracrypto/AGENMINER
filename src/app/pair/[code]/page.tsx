"use client";

// ============================================
// AGENTIC MINER — Halaman Pairing /pair/[code]
// Dibuka saat QR di modal Agent Wallet discan (kamera HP / browser lain).
// 1) Hubungkan wallet di perangkat ini (dApp browser Binance / wallet browser)
// 2) Verifikasi NFT Agentic ID (SPACE ID Agent ID) — server-side
// 3) Setujui koneksi → modal di perangkat pertama auto-login
// ============================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Timer,
  CheckCircle2,
  Pickaxe,
  Copy,
  Check,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import { connectProvider, getWalletOptions, probeAgentId, type WalletOption } from "@/lib/wallet";
import PageBackground from "@/components/game/page-background";
import type { PublicUser } from "@/lib/types";

type PairState = "loading" | "ready" | "approving" | "approved" | "expired" | "notfound" | "error";
type NftState = "idle" | "checking" | "ok" | "denied" | "unverified";

export default function PairPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params?.code ?? "").toLowerCase();

  const [state, setState] = useState<PairState>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // wallet di perangkat kedua
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [walletAddr, setWalletAddr] = useState("");
  const [walletName, setWalletName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [nft, setNft] = useState<NftState>("idle");

  // Validasi awal: cek sesi lewat endpoint status
  const codeValid = /^[0-9a-f]{6}$/.test(code);
  const view = !codeValid ? "notfound" : state;

  useEffect(() => {
    if (!codeValid) return;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch(`/api/pair/status?code=${code}`);
        const d = await r.json();
        if (!alive) return;
        if (d?.status === "EXPIRED") setState("expired");
        else if (d?.status === "NOT_FOUND") setState("notfound");
        else setState("ready");
      } catch {
        if (alive) setState("error");
      }
    };
    check();
    // deteksi wallet browser (diam-diam)
    getWalletOptions()
      .then((opts) => {
        if (alive) setOptions(opts);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [code, codeValid]);

  const connectWallet = async (opt: WalletOption) => {
    if (!opt.provider) return;
    setConnecting(true);
    setErrorMsg("");
    try {
      const addr = await connectProvider(opt.provider);
      setWalletAddr(addr.toLowerCase());
      setWalletName(opt.name);
      setNft("checking");
      const probe = await probeAgentId(addr.toLowerCase());
      setNft(probe.trusted ? (probe.hasNft ? "ok" : "denied") : "unverified");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan wallet";
      setErrorMsg(/reject|denied/i.test(msg) ? "Koneksi dibatalkan di wallet / Rejected in wallet" : msg);
    } finally {
      setConnecting(false);
    }
  };

  const approve = async () => {
    setState("approving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/pair/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, address: walletAddr }),
      });
      const d = await res.json();
      if (!res.ok || !d?.ok) {
        if (res.status === 410) setState("expired");
        else {
          setState("error");
          setErrorMsg(d?.error ?? "Gagal menyetujui / Failed to approve");
        }
        return;
      }
      setUser(d.user);
      setState("approved");
    } catch {
      setState("error");
      setErrorMsg("Network error");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const canApprove = (nft === "ok" || nft === "unverified") && Boolean(walletAddr) && state === "ready";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0E11] text-[#EAECEF]">
      <PageBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10">
        {/* Brand kecil */}
        <div className="flex flex-col items-center gap-2">
          <div className="am-float flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#F0B90B]/60 bg-[#0B0E11] shadow-[0_0_40px_rgba(240,185,11,0.35)]">
            <img src="/logo.png" alt="AGENTIC MINER" className="h-full w-full object-cover" />
          </div>
          <p className="text-xs font-bold tracking-[0.25em] text-[#848E9C]">AGENTIC MINER</p>
        </div>

        {/* Kartu pairing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="am-card w-full rounded-2xl border border-[#2B3139] bg-[#181A20]/90 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur"
        >
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0B90B] text-[#0B0E11]">
              <Pickaxe className="h-5 w-5" />
            </span>
            Agent Wallet
          </h1>

          {view === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-[#848E9C]">
              <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
              Checking pairing session…
            </div>
          )}

          {(view === "ready" || view === "approving") && (
            <div className="mt-5 flex flex-col items-center gap-5">
              <p className="text-center text-sm leading-relaxed text-[#848E9C]">
                Perangkat lain ingin masuk ke <span className="font-bold text-[#EAECEF]">AGENTIC MINER</span>.
                <br />
                Hubungkan wallet pemegang <span className="font-bold text-[#F0B90B]">Agentic ID</span>, pastikan pairing
                code sama.
                <br />
                <span className="text-xs">
                  Connect a wallet holding the Agentic ID NFT, then approve.
                </span>
              </p>

              <button
                onClick={copyCode}
                className="flex items-center gap-2 rounded-xl border border-[#F0B90B]/40 bg-[#F0B90B]/10 px-5 py-2.5 font-mono text-2xl font-extrabold tracking-[0.35em] text-[#F0B90B]"
              >
                {code}
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 opacity-60" />}
              </button>

              {/* Langkah 1 — connect wallet */}
              <div className="w-full space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#848E9C]">
                  1 · Hubungkan wallet / Connect wallet
                </p>

                {walletAddr ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#2B3139] bg-[#0B0E11] p-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-[#EAECEF]">{walletAddr}</p>
                      <p className="text-[10px] text-[#848E9C]">{walletName}</p>
                    </div>
                    {nft === "checking" && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[#848E9C]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                      </span>
                    )}
                    {nft === "ok" && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#20B26C]">
                        <BadgeCheck className="h-4 w-4" /> Agentic ID ✓
                      </span>
                    )}
                    {nft === "denied" && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#F6465D]">
                        <ShieldX className="h-4 w-4" /> No Agentic ID
                      </span>
                    )}
                    {nft === "unverified" && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#F0B90B]">
                        <ShieldAlert className="h-4 w-4" /> Verify at approve
                      </span>
                    )}
                  </div>
                ) : options.length > 0 ? (
                  options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => connectWallet(opt)}
                      disabled={connecting}
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
                          {opt.isBinance ? "Agentic Wallet • BNB Chain" : "Detected wallet"}
                        </p>
                      </div>
                      {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#F0B90B]" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-[#20B26C]" />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-[#2B3139] p-3 text-center text-[11px] leading-relaxed text-[#848E9C]">
                    Tidak ada wallet terdeteksi. Buka halaman ini lewat browser dApp di Binance App
                    (Agent Wallet → Discover), lalu hubungkan wallet.
                    <br />
                    No wallet detected — open this page inside the Binance App dApp browser.
                  </p>
                )}
              </div>

              {/* Langkah 2 — setujui */}
              <Button
                onClick={approve}
                disabled={!canApprove}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] py-3.5 text-base font-extrabold text-[#0B0E11] shadow-[0_8px_30px_rgba(240,185,11,0.3)] hover:opacity-90 disabled:opacity-40"
              >
                {state === "approving" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Setujui Koneksi
                  </>
                )}
              </Button>
              {nft === "denied" && (
                <p className="text-center text-[11px] leading-relaxed text-[#F6465D]">
                  Wallet ini tidak memegang NFT Agentic ID — akses ditolak. Klaim .ai Agent ID di Agentic Wallet Binance
                  terlebih dahulu.
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[11px] text-[#848E9C]">
                <Timer className="h-3.5 w-3.5" />
                Pairing berlaku 5 menit • Valid for 5 minutes
              </p>
            </div>
          )}

          {view === "approved" && user && (
            <div className="mt-5 flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-[#20B26C]/20 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#20B26C]/60 bg-[#20B26C]/10">
                  <CheckCircle2 className="h-9 w-9 text-[#20B26C]" />
                </div>
              </div>
              <div>
                <p className="text-base font-bold text-[#20B26C]">Koneksi Disetujui ✓</p>
                <p className="mt-1 text-xs text-[#848E9C]">
                  Connection approved. Kembali ke aplikasi — login berlanjut otomatis.
                </p>
              </div>
              <div className="w-full rounded-xl border border-[#2B3139] bg-[#0B0E11] p-4">
                <p className="text-[10px] uppercase tracking-wide text-[#848E9C]">Agent ID Anda / Your Agent ID</p>
                <p className="mt-1 text-xl font-extrabold text-[#F0B90B]">{user.agentId ?? user.username}</p>
                <p className="mt-1 text-[11px] text-[#848E9C]">
                  Agent ID = username &amp; invite code Anda
                </p>
              </div>
              <Button
                onClick={() => router.replace("/")}
                variant="outline"
                className="h-11 w-full rounded-xl border-[#2B3139] bg-[#0B0E11] text-sm font-bold hover:bg-[#1E2329]"
              >
                Buka AGENTIC MINER →
              </Button>
            </div>
          )}

          {view === "expired" && (
            <PairProblem
              icon={<Timer className="h-9 w-9 text-[#F6465D]" />}
              title="Pairing Kedaluwarsa"
              desc="Kode tidak berlaku lagi (>5 menit). Kembali ke aplikasi dan pindai QR baru."
              descEn="The code has expired. Go back to the app and scan a fresh QR."
            />
          )}

          {view === "notfound" && (
            <PairProblem
              icon={<ShieldAlert className="h-9 w-9 text-[#F6465D]" />}
              title="Sesi Tidak Ditemukan"
              desc="Pastikan memindai QR langsung dari aplikasi AGENTIC MINER."
              descEn="Session not found. Scan the QR directly from the AGENTIC MINER app."
            />
          )}

          {view === "error" && (
            <PairProblem
              icon={<ShieldAlert className="h-9 w-9 text-[#F6465D]" />}
              title="Terjadi Kesalahan"
              desc={errorMsg || "Coba lagi dari aplikasi."}
              descEn="Something went wrong. Try again from the app."
            />
          )}
        </motion.div>

        <p className="max-w-xs text-center text-[10px] leading-relaxed text-[#5E6673]">
          AGENTIC MINER adalah game demo — tidak berafiliasi dengan Binance. / Demo game, not affiliated with Binance.
        </p>
      </div>
    </div>
  );
}

function PairProblem({
  icon,
  title,
  desc,
  descEn,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  descEn: string;
}) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3 py-6 text-center">
      {icon}
      <p className="text-base font-bold">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-[#848E9C]">
        {desc}
        <br />
        {descEn}
      </p>
    </div>
  );
}
