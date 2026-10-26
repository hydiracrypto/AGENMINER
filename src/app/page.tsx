"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GameHeader from "@/components/game/game-header";
import LoginScreen from "@/components/game/login-screen";
import WalletConnectModal from "@/components/game/wallet-connect-modal";
import MineTab from "@/components/game/mine-tab";
import BoostTab from "@/components/game/boost-tab";
import FriendsTab from "@/components/game/friends-tab";
import RankTab from "@/components/game/rank-tab";
import WalletTab from "@/components/game/wallet-tab";
import BottomNav from "@/components/game/bottom-nav";
import SidebarNav from "@/components/game/sidebar-nav";
import PageBackground from "@/components/game/page-background";
import RewardModal from "@/components/game/reward-modal";
import { useGameStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { clearSession, loadSession } from "@/lib/wallet";
import { TOKEN } from "@/lib/game-config";

export default function Page() {
  const user = useGameStore((s) => s.user);
  const setUser = useGameStore((s) => s.setUser);
  const tab = useGameStore((s) => s.tab);
  const connectOpen = useGameStore((s) => s.connectOpen);
  const setConnectOpen = useGameStore((s) => s.setConnectOpen);
  const refCode = useGameStore((s) => s.refCode);
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
        // Akun tidak ada lagi di server (mis. DB production ter-reset saat publish)
        // → daftar ulang secara diam-diam agar sesi tidak mati; tampilan mulai
        // dari saldo 0 seperti akun baru. Gagal juga → bersihkan sesi (login ulang).
        try {
          const res = await api.login(session.address);
          setUser(res.user);
        } catch {
          clearSession();
        }
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
      <div className="relative min-h-screen bg-[#0B0E11]">
        <PageBackground />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="h-16 w-16 rounded-full border-4 border-[#2B3139] border-t-[#F0B90B]"
          />
          <p className="text-sm font-semibold tracking-wide text-[#848E9C]">AGENTIC MINER</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <WalletConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} refCode={refCode} />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0B0E11] text-[#EAECEF]">
      <PageBackground />

      {/* Sidebar desktop (lg+) */}
      <SidebarNav />

      {/* Kolom konten — digeser oleh sidebar di desktop */}
      <div className="relative z-10 flex min-h-screen flex-col lg:pl-64">
        <GameHeader />

        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] pt-4 md:max-w-2xl md:px-6 md:pb-44 lg:max-w-6xl lg:px-8 lg:pb-12 lg:pt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {tab === "mine" && <MineTab />}
              {tab === "boost" && <BoostTab />}
              {tab === "friends" && <FriendsTab />}
              {tab === "rank" && <RankTab />}
              {tab === "wallet" && <WalletTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer desktop profesional */}
        <footer className="relative z-10 hidden border-t border-[#2B3139]/70 px-8 py-5 lg:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between text-[11px] text-[#5E6673]">
            <p>
              © {new Date().getFullYear()} AGENTIC MINER • {TOKEN.name} ({TOKEN.symbol}) — BEP-20
            </p>
            <p className="font-mono">
              {TOKEN.chainShort} Mainnet • Chain ID {TOKEN.chainId} • Powered by Agentic AI
            </p>
          </div>
        </footer>
      </div>

      {/* Navigasi bawah mobile (di bawah lg) */}
      <BottomNav />
      <WalletConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} refCode={refCode} />
      <RewardModal result={reward} onClose={() => setReward(null)} />
    </div>
  );
}
