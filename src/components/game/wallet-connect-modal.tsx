"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ShieldCheck, Loader2, Sparkles, AlertTriangle, Keyboard } from "lucide-react";
import {
  connectProvider,
  getWalletOptions,
  saveSession,
  type WalletOption,
} from "@/lib/wallet";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { isValidEvmAddress } from "@/lib/game-config";

interface Props {
  open: boolean;
  onClose: () => void;
  refCode?: string | null;
}

export default function WalletConnectModal({ open, onClose, refCode }: Props) {
  const setUser = useGameStore((s) => s.setUser);
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [scanning, setScanning] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoAddress, setDemoAddress] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Scan wallet yang tersedia saat modal dibuka
  useEffect(() => {
    if (!open) return;
    setError(null);
    setDemoMode(false);
    setScanning(true);
    getWalletOptions()
      .then((opts) => {
        if (!mounted.current) return;
        setOptions(opts);
        setScanning(false);
      })
      .catch(() => {
        if (!mounted.current) return;
        setOptions([]);
        setScanning(false);
      });
  }, [open]);

  const completeLogin = useCallback(
    async (address: string, walletName: string) => {
      setLoggingIn(true);
      setError(null);
      try {
        const res = await api.login(address, refCode ?? undefined);
        saveSession({ address: res.user.walletAddress, walletName, loginAt: Date.now() });
        setUser(res.user);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal masuk");
      } finally {
        if (mounted.current) setLoggingIn(false);
      }
    },
    [refCode, setUser, onClose]
  );

  const handleConnect = useCallback(
    async (opt: WalletOption) => {
      if (!opt.provider) return;
      setConnecting(opt.id);
      setError(null);
      try {
        const address = await connectProvider(opt.provider);
        await completeLogin(address, opt.name);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes("user rejected") || err.message.includes("denied")
              ? "Koneksi dibatalkan di wallet"
              : err.message
            : "Gagal terhubung ke wallet";
        setError(msg);
      } finally {
        if (mounted.current) setConnecting(null);
      }
    },
    [completeLogin]
  );

  const handleDemoLogin = useCallback(async () => {
    const addr = demoAddress.trim();
    if (!isValidEvmAddress(addr)) {
      setError("Format alamat tidak valid. Contoh: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
      return;
    }
    await completeLogin(addr.toLowerCase(), "Mode Demo");
  }, [demoAddress, completeLogin]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-[#2B3139] bg-[#181A20] text-[#EAECEF] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#2B3139]">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Wallet className="h-5 w-5 text-[#F0B90B]" />
            Hubungkan Binance Agentic Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {scanning && (
            <div className="flex items-center gap-3 rounded-xl border border-[#2B3139] bg-[#0B0E11] p-4 text-sm text-[#848E9C]">
              <Loader2 className="h-4 w-4 animate-spin text-[#F0B90B]" />
              Memindai wallet di browser kamu...
            </div>
          )}

          {!scanning && options.length === 0 && (
            <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] p-4 text-sm text-[#848E9C] flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#F0B90B]" />
              <p>
                Tidak ada wallet Web3 terdeteksi. Install <span className="text-[#EAECEF]">Binance Web3 Wallet</span>{" "}
                (ekstensi browser / di dalam aplikasi Binance), atau gunakan Mode Demo di bawah untuk mencoba game.
              </p>
            </div>
          )}

          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleConnect(opt)}
              disabled={connecting !== null || loggingIn}
              className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${
                opt.isBinance
                  ? "border-[#F0B90B]/50 bg-[#F0B90B]/10 hover:bg-[#F0B90B]/15"
                  : "border-[#2B3139] bg-[#0B0E11] hover:bg-[#1E2329]"
              }`}
            >
              {opt.icon ? (
                <img src={opt.icon} alt={opt.name} className="h-9 w-9 rounded-lg" />
              ) : (
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                    opt.isBinance ? "bg-[#F0B90B] text-[#0B0E11]" : "bg-[#1E2329] text-[#848E9C]"
                  }`}
                >
                  <Wallet className="h-5 w-5" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  {opt.name}
                  {opt.isBinance && (
                    <span className="rounded-full bg-[#F0B90B] px-1.5 py-0.5 text-[9px] font-bold text-[#0B0E11]">
                      REKOMENDED
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#848E9C] truncate">
                  {opt.isBinance ? "Agentic Wallet • BNB Smart Chain" : "Wallet Web3 terdeteksi"}
                </p>
              </div>
              {connecting === opt.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#F0B90B]" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-[#20B26C]" />
              )}
            </button>
          ))}

          {/* Mode demo */}
          {!demoMode ? (
            <button
              onClick={() => {
                setDemoMode(true);
                setError(null);
              }}
              disabled={scanning || connecting !== null || loggingIn}
              className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[#2B3139] p-4 text-left hover:bg-[#1E2329] transition-colors disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E2329] text-[#848E9C]">
                <Keyboard className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-sm">Mode Demo (Alamat Manual)</p>
                <p className="text-xs text-[#848E9C]">Masuk dengan menempelkan alamat wallet BNB kamu</p>
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] p-4 space-y-3">
              <p className="text-xs text-[#848E9C] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#C994F7]" />
                Untuk testing cepat tanpa ekstensi wallet. Gunakan alamat BNB Chain kamu.
              </p>
              <Input
                value={demoAddress}
                onChange={(e) => setDemoAddress(e.target.value)}
                placeholder="0x..."
                className="bg-[#181A20] border-[#2B3139] text-sm font-mono"
                maxLength={42}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleDemoLogin}
                  disabled={loggingIn}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90"
                >
                  {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDemoMode(false)}
                  className="h-10 rounded-xl text-[#848E9C] hover:text-[#EAECEF]"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#F6465D]/40 bg-[#F6465D]/10 p-3 text-xs text-[#F6465D]">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#2B3139] text-[10px] leading-relaxed text-[#848E9C]">
          Dengan masuk, kamu setuju bahwa mining reward disimpan sebagai saldo game di jaringan {`BNB Chain`} dan dapat
          ditarik ke wallet setelah diproses tim distribusi.
        </div>
      </DialogContent>
    </Dialog>
  );
}
