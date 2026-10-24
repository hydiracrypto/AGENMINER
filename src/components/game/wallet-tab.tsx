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
  Infinity as InfinityIcon,
  Droplets,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOKEN, WITHDRAW, PANCAKESWAP, fmtNum, splitWithdrawal, truncateAddress } from "@/lib/game-config";
import { api } from "@/lib/api-client";
import { useGameStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { clearSession } from "@/lib/wallet";
import type { GlobalStats, RecentMine, WithdrawalItem } from "@/lib/types";

export default function WalletTab() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const { t, lang } = useT();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [mines, setMines] = useState<RecentMine[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);

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

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const parseAmount = (raw: string): number => Number(raw.replace(/\./g, "").replace(",", "."));

  const handleWithdraw = useCallback(async () => {
    if (!user || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const amt = parseAmount(amount);
      const res = await api.withdraw(user.walletAddress, amt);
      setUser(res.user);
      setAmount("");
      const { net, fee } = splitWithdrawal(amt);
      setFeedback({
        type: "ok",
        msg: t("okWithdraw", { n: fmtNum(net, 2, lang), fee: fmtNum(fee, 2, lang), sym: TOKEN.symbol }),
      });
      loadHistory();
      api
        .stats()
        .then(setStats)
        .catch(() => {});
    } catch (err) {
      const e = err as Error & { errorKey?: string };
      if (e.errorKey === "insufficient") {
        setFeedback({ type: "err", msg: t("errInsufficientBal") });
      } else {
        setFeedback({ type: "err", msg: e.message ?? t("errWithdraw") });
      }
    } finally {
      setBusy(false);
    }
  }, [user, busy, amount, setUser, loadHistory, t, lang]);

  const handleDisconnect = useCallback(() => {
    clearSession();
    setUser(null);
  }, [setUser]);

  if (!user) return null;

  const amt = amount.trim() ? parseAmount(amount) : 0;
  const validAmount = Number.isFinite(amt) && amt > 0;
  const canWithdraw = validAmount && user.balance > 0; // TANPA minimal — saldo berapapun bisa ditarik
  const contractKnown = TOKEN.contractAddress.length > 0;
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const preview = validAmount ? splitWithdrawal(Math.min(amt, user.balance)) : null;

  return (
    <div className="space-y-4">
      {/* Ringkasan saldo */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon={<Coins className="h-4 w-4 text-[#F0B90B]" />} label={t("statBalance")} value={fmtNum(user.balance, 2, lang)} />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-[#20B26C]" />} label={t("statMined")} value={fmtNum(user.totalMined, 2, lang)} />
        <StatCard icon={<Users className="h-4 w-4 text-[#C994F7]" />} label={t("statRef")} value={fmtNum(user.refEarnings, 2, lang)} />
      </div>

      {/* Tarik ke wallet + Likuiditas — grid desktop 2 kolom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {/* Tarik ke wallet — TANPA MINIMAL + AUTO MINT */}
      <div className="am-card rounded-2xl border border-[#20B26C]/40 bg-gradient-to-br from-[#20B26C]/8 to-[#181A20] p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Send className="h-4 w-4 text-[#F0B90B]" /> {t("withdrawTitle", { chain: TOKEN.chainShort })}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <span className="flex items-center gap-1 rounded-full bg-[#C994F7]/15 border border-[#C994F7]/40 px-2 py-1 text-[9px] font-extrabold text-[#C994F7]">
              <Cpu className="h-3 w-3" /> {t("autoMintBadge")}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-[#20B26C]/15 border border-[#20B26C]/40 px-2 py-1 text-[9px] font-extrabold text-[#20B26C]">
              <InfinityIcon className="h-3 w-3" /> {t("noMinBadge")}
            </span>
          </div>
        </div>
        <p className="text-xs text-[#848E9C]">
          {t("noMinNote", { addr: truncateAddress(user.walletAddress) })}
        </p>
        <div className="flex gap-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder={t("amountPlaceholder")}
            inputMode="decimal"
            className="flex-1 h-11 bg-[#0B0E11] border-[#2B3139] font-mono text-sm focus-visible:ring-[#F0B90B]/50"
          />
          <Button
            onClick={handleWithdraw}
            disabled={busy || !canWithdraw}
            className="h-11 rounded-xl bg-gradient-to-r from-[#F8D33A] to-[#F0B90B] font-bold text-[#0B0E11] hover:opacity-90 disabled:opacity-40 px-5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("withdrawBtn")}
          </Button>
        </div>

        {/* Preview pecahan: net → wallet, fee → PancakeSwap */}
        {preview && (
          <div className="rounded-xl border border-[#2B3139] bg-[#0B0E11] px-3.5 py-2.5 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#848E9C]">{t("receiveLabel")}</span>
              <span className="font-bold tabular-nums text-[#20B26C]">
                {fmtNum(preview.net, 2, lang)} {TOKEN.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#848E9C]">{t("feeLabel", { p: WITHDRAW.feePct })}</span>
              <span className="font-bold tabular-nums text-[#F0B90B]">
                -{fmtNum(preview.fee, 2, lang)} {TOKEN.symbol}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#848E9C]">
            {t("statBalance")}: <span className="font-bold text-[#EAECEF]">{fmtNum(user.balance, 2, lang)} {TOKEN.symbol}</span>
          </span>
          {user.balance > 0 && (
            <button
              onClick={() => setAmount(String(user.balance))}
              className="font-semibold text-[#F0B90B] hover:underline"
            >
              MAX
            </button>
          )}
        </div>
        {user.balance <= 0 && (
          <p className="text-[11px] text-[#848E9C]">{t("withdrawZero")}</p>
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

      {/* Likuiditas PancakeSwap dari fee penarikan */}
      <div className="am-card rounded-2xl border border-[#E8C4F7]/25 bg-gradient-to-br from-[#A855F7]/8 to-[#181A20] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-[#C994F7]" /> {t("liquidityTitle")}
          </h3>
          <span className="rounded-full bg-[#A855F7]/15 border border-[#A855F7]/40 px-2 py-0.5 text-[9px] font-extrabold text-[#C994F7]">
            {PANCAKESWAP.dex}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[#848E9C]">{t("liquiditySub")}</p>
        <div className="mt-3 flex items-end justify-between rounded-xl bg-[#0B0E11] border border-[#2B3139] px-4 py-3">
          <div>
            <p className="text-xl font-extrabold tabular-nums text-[#C994F7]">
              {stats ? `+${fmtNum(stats.totalLiquidityAdded, 2, lang)}` : "—"} <span className="text-xs font-semibold">{TOKEN.symbol}</span>
            </p>
            <p className="text-[10px] text-[#848E9C]">{t("feeLabel", { p: stats?.withdrawFeePct ?? WITHDRAW.feePct })}</p>
          </div>
          <div className="text-right text-[10px] text-[#848E9C] leading-relaxed">
            <p className="font-mono">AGENMINER / BNB</p>
            <p>{TOKEN.chainShort} Mainnet</p>
          </div>
        </div>
        {!stats?.totalLiquidityAdded && <p className="mt-2 text-[11px] text-[#848E9C]">{t("liquidityEmpty")}</p>}
      </div>
      </div>

      {/* Info kontrak + riwayat penarikan — grid desktop 2 kolom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {/* Info kontrak */}
      <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5 space-y-2.5">
        <h3 className="text-sm font-bold">🪙 {t("tokenInfo", { sym: TOKEN.symbol })}</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#848E9C]">{t("lblName")}</span>
            <span className="font-semibold">{TOKEN.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848E9C]">{t("lblStandard")}</span>
            <span className="font-semibold">BEP-20 • {TOKEN.chainName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#848E9C]">{t("lblSupply")}</span>
            <span className="font-semibold">{fmtNum(TOKEN.totalSupply, 0, lang)}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-[#848E9C] shrink-0">{t("lblContract")}</span>
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
                {t("comingSoon")}
              </span>
            )}
          </div>
        </div>
        {!contractKnown && (
          <p className="flex gap-1.5 rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3 text-[11px] leading-relaxed text-[#848E9C]">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#F0B90B]" />
            {t("contractPending")}
          </p>
        )}
      </div>

      {/* Riwayat penarikan */}
      {withdrawals.length > 0 && (
        <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <History className="h-4 w-4 text-[#848E9C]" /> {t("withdrawHistory")}
          </h3>
          <ul className="space-y-2.5 max-h-56 overflow-y-auto agenminer-scroll">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-xl bg-[#0B0E11] border border-[#2B3139] px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-bold tabular-nums">
                    -{fmtNum(w.amount, 2, lang)} {TOKEN.symbol}
                    {typeof w.fee === "number" && w.fee > 0 && (
                      <span className="ml-2 text-[10px] font-semibold text-[#C994F7]">
                        💧 {t("feeAmountLabel")} {fmtNum(w.fee, 2, lang)} → PCS
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#848E9C]">
                    {new Date(w.createdAt).toLocaleString(locale)}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0 ${
                    w.status === "PROCESSED"
                      ? "bg-[#C994F7]/15 text-[#C994F7]"
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
                  {w.status === "PENDING" ? t("wPending") : w.status === "PROCESSED" ? t("wMinted") : w.status === "REJECTED" ? t("wRejected") : t("wSent")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>

      {/* Riwayat tambang */}
      <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20] p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
          <History className="h-4 w-4 text-[#848E9C]" /> {t("lastMines")}
        </h3>
        {mines.length === 0 ? (
          <p className="text-xs text-[#848E9C] text-center py-4">{t("emptyMines")}</p>
        ) : (
          <ul className="space-y-2.5 max-h-72 overflow-y-auto agenminer-scroll">
            {mines.map((m) => (
              <li key={m.id} className="rounded-xl bg-[#0B0E11] border border-[#2B3139] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#EAECEF] truncate flex-1">{m.prompt}</p>
                  <span className="text-xs font-extrabold text-[#20B26C] tabular-nums shrink-0">+{fmtNum(m.reward, 2, lang)}</span>
                </div>
                <p className="mt-1 text-[10px] text-[#848E9C]">
                  {t("score", { n: m.score })} • {new Date(m.createdAt).toLocaleString(locale)}
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
        <LogOut className="mr-2 h-4 w-4" /> {t("logout", { addr: truncateAddress(user.walletAddress) })}
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
