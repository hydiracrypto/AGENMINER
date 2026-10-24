"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import GameHeader from "@/components/game/game-header";
import LoginScreen from "@/components/game/login-screen";
import WalletConnectModal from "@/components/game/wallet-connect-modal";
import MineTab from "@/components/game/mine-tab";
import BoostTab from "@/components/game/boost-tab";
import FriendsTab from "@/components/game/friends-tab";
import RankTab from "@/components/game/rank-tab";
import WalletTab from "@/components/game/wallet-tab";
import BottomNav from "@/components/game/bottom-nav";
import RewardModal from "@/components/game/reward-modal";
import { useGameStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { clearSession, loadSession } from "@/lib/wallet";

export default function Page() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const tab = useGameStore((s) => s.tab);
  const connectOpen = useGameStore((s) => s.connectOpen);
  const setConnectOpen = useGameStore((s) => s.setConnectOpen);
  const reward = useGameStore((s) => s.reward);
  const setReward = useGameStore((s) => s.setReward);

  const [booting, setBooting] = useState(true);
  const bootstrapped = useRef(false);

  // Pulihkan sesi login dari localStorage
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const init = async () => {
      // yield ke microtask agar setState tidak sinkron di dalam effect
      await Promise.resolve();
      const session = loadSession();
      if (!session) {
        setBooting(false);
        return;
      }
      try {
        const res = await api.getUser(session.address);
        setUser(res.user);
      } catch {
        clearSession();
      } finally {
        setBooting(false);
      }
    };
    init();
  }, [setUser]);

  // Sinkronkan saldo saat tab kembali aktif (mis. kembali dari lain app)
  const refreshUser = useCallback(async () => {
    const session = loadSession();
    if (!session) return;
    try {
      const res = await api.getUser(session.address);
      setUser(res.user);
    } catch {
      /* diamkan */
    }
  }, [setUser]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && user) refreshUser();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, refreshUser]);

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-full border-4 border-[#2B3139] border-t-[#F0B90B]"
        />
        <p className="text-sm text-[#848E9C] font-semibold tracking-wide">AGENTIC MINER • memuat rig...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <WalletConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col">
      <GameHeader />

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-32">
        {tab === "mine" && <MineTab />}
        {tab === "boost" && <BoostTab />}
        {tab === "friends" && <FriendsTab />}
        {tab === "rank" && <RankTab />}
        {tab === "wallet" && <WalletTab />}
      </main>

      <BottomNav />
      <WalletConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
      <RewardModal result={reward} onClose={() => setReward(null)} />
    </div>
  );
}
