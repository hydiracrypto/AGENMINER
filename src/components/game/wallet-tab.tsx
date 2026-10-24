"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Coins,
  TrendingUp,
  Users,
  Send,
  Loader2,
  ExternalLink,
  History,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GAME, TOKEN, fmtNum, truncateAddress } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { clearSession } from "@/lib/wallet";
import type { RecentMine, WithdrawalItem } from "@/lib/types";

export default function WalletTab() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [mines, setMines] = useState<RecentMine[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getUser(user.walletAddress);
      setMines(res.recentMines ?? []);
      setWithdrawals(res.withdrawals ?? []);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleWithdraw = useCallback(async () => {
    if (!user || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const amt = Number(amount.replace(/\./g, "").replace(",", "."));
      const res = await api.withdraw(user.walletAddress, amt);
      setUser(res.user);
      setAmount("");
      setFeedback({ type: "ok", msg: res.message });
      loadHistory();
    } catch (err) {
      setFeedback({ type: "err", msg: err instanceof Error ? err.message : "Gagal menarik" });
    } finally {
      setBusy(false);
    }
  }, [user, busy, amount, setUser, loadHistory]);

  const handleDisconnect = useCallback(() => {
    clearSession();
    setUser(null);
  }, [setUser]);

  if (!user) return null;

  const contractKnown = TOKEN.contractAddress.length > 0;

  return (
    <div className="space-y-4">
      {/* Ringkasan saldo */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon={<Coins className="h-4 w-4 text-[#F0B90B]" />} label="Saldo" value={fmtNum(user.balance)} />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-[#20B26C]" />} label="Total Tambang" value={fmtNum(user.totalMined)} />
        <StatCard icon={<Users className="h-4 w-4 text-[#C994F7]" />} label="Komisi Ref" value={fmtNum(user.refEarnings)} />
      </div>

      {/* Tarik ke wallet */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Send className="h-4 w-4 text-[#F0B90B]" /> Tarik ke Wallet {TOKEN.chainShort}
        </h3>
        <p className="text-xs text-[#848E9C]">
          Minimal {fmtNum(GAME.minWithdraw, 0)} {TOKEN.symbol}. Reward dikirim sebagai token BEP-20 ke alamat{" "}
          <span className="font-mono text-[#EAECEF]">{truncateAddress(user.walletAddress)}</span> setelah diproses tim
          distribusi.
        </p>
        <div className="flex gap-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder={`Jumlah, mis. ${fmtNum(GAME.minWithdraw, 0)}`}
            inputMode="decimal"
            className="flex-1 h-11 bg-[#0B0E11] border-[#2B3139] font-mono text-sm focus-visible:ring-[#F0B90B]/50"
          />
          <Button
            onClick={handleWithdraw}
            disabled={busy || user.balance < GAME.minWithdraw}
            className="h-11 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90 disabled:opacity-40 px-5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tarik"}
          </Button>
        </div>
        {user.balance < GAME.minWithdraw && (
          <p className="text-[11px] text-[#848E9C]">
            Butuh {fmtNum(GAME.minWithdraw - user.balance)} {TOKEN.symbol} lagi untuk bisa menarik.
          </p>
        )}
        {feedback && (
          <div
            className={`rounded-xl border p-3 text-xs ${
              feedback.type === "ok"
                ? "border-[#20B26C]/40 bg-[#20B26C]/10 text-[#20B26C]"
                : "border-[#F6465D]/40 bg-[#F6465D]/10 text-[#F6465D]"
            }`}
          >
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Info kontrak */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5 space-y-2.5">
        <h3 className="text-sm font-bold">🪙 Info Token {TOKEN.symbol}</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#848E9C]">Nama</span>
            <span className="font-semibold">{TOKEN.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848E9C]">Standar</span>
            <span className="font-semibold">BEP-20 • {TOKEN.chainName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848E9C]">Suplai Tetap</span>
            <span className="font-semibold">{fmtNum(TOKEN.totalSupply, 0)}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-[#848E9C] shrink-0">Kontrak</span>
            {contractKnown ? (
              <a
                href={`${TOKEN.explorer}/token/${TOKEN.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[#F0B90B] hover:underline break-all text-right"
              >
                {truncateAddress(TOKEN.contractAddress)} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F0B90B]">
                SEGERA DIUMUMKAN
              </span>
            )}
          </div>
        </div>
        {!contractKnown && (
          <p className="flex gap-1.5 rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3 text-[11px] leading-relaxed text-[#848E9C]">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#F0B90B]" />
            Kontrak BEP-20 sedang dalam proses deploy mainnet. Penarikan kamu otomatis diproses segera setelah kontrak
            aktif — saldo game tetap aman.
          </p>
        )}
      </div>

      {/* Riwayat penarikan */}
      {withdrawals.length > 0 && (
        <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <History className="h-4 w-4 text-[#848E9C]" /> Riwayat Penarikan
          </h3>
          <ul className="space-y-2.5 max-h-56 overflow-y-auto agenminer-scroll">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-xl bg-[#0B0E11] border border-[#2B3139] px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-bold tabular-nums">-{fmtNum(w.amount)} {TOKEN.symbol}</p>
                  <p className="text-[10px] text-[#848E9C]">{new Date(w.createdAt).toLocaleString("id-ID")}</p>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    w.status === "PROCESSED"
                      ? "bg-[#20B26C]/15 text-[#20B26C]"
                      : w.status === "REJECTED"
                        ? "bg-[#F6465D]/15 text-[#F6465D]"
                        : "bg-[#F0B90B]/15 text-[#F0B90B]"
                  }`}
                >
                  {w.status === "PROCESSED" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {w.status === "PENDING" ? "DIPROSES" : w.status === "PROCESSED" ? "TERKIRIM" : "DITOLAK"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riwayat tambang */}
      <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
          <History className="h-4 w-4 text-[#848E9C]" /> 10 Sesi Tambang Terakhir
        </h3>
        {mines.length === 0 ? (
          <p className="text-xs text-[#848E9C] text-center py-4">Belum ada sesi tambang. Mulai dari tab Mine!</p>
        ) : (
          <ul className="space-y-2.5 max-h-72 overflow-y-auto agenminer-scroll">
            {mines.map((m) => (
              <li key={m.id} className="rounded-xl bg-[#0B0E11] border border-[#2B3139] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#EAECEF] truncate flex-1">{m.prompt}</p>
                  <span className="text-xs font-extrabold text-[#20B26C] tabular-nums shrink-0">+{fmtNum(m.reward)}</span>
                </div>
                <p className="mt-1 text-[10px] text-[#848E9C]">
                  Skor {m.score}/100 • {new Date(m.createdAt).toLocaleString("id-ID")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Keluar */}
      <Button
        onClick={handleDisconnect}
        variant="ghost"
        className="w-full h-11 rounded-xl text-[#F6465D] hover:bg-[#F6465D]/10 hover:text-[#F6465D]"
      >
        <LogOut className="mr-2 h-4 w-4" /> Keluar dari {truncateAddress(user.walletAddress)}
      </Button>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#2B3139] bg-[#181A20] p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#848E9C]">
        {icon}
        {label}
      </span>
      <p className="mt-1 text-sm font-extrabold tabular-nums truncate">{value}</p>
    </div>
  );
}
