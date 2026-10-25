// ============================================
// AGENTIC MINER — Zustand Store (client state)
// ============================================

"use client";

import { create } from "zustand";
import type { MineResult, PublicUser } from "./types";
import { clearSession } from "./wallet";

export type GameTab = "mine" | "boost" | "friends" | "rank" | "wallet";

interface GameState {
  user: PublicUser | null;
  tab: GameTab;
  connectOpen: boolean;
  refCode: string | null;
  reward: MineResult | null;
  refreshing: boolean;
  setUser: (u: PublicUser | null) => void;
  setTab: (t: GameTab) => void;
  setConnectOpen: (open: boolean) => void;
  setRefCode: (c: string | null) => void;
  setReward: (r: MineResult | null) => void;
  setRefreshing: (b: boolean) => void;
  /** Logout penuh: hapus sesi lokal + sign out Agentic Wallet di server
   *  → login berikutnya WAJIB sign ulang di Binance App */
  logout: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  tab: "mine",
  connectOpen: false,
  refCode: null,
  reward: null,
  refreshing: false,
  setUser: (user) => set({ user }),
  setTab: (tab) => set({ tab }),
  setConnectOpen: (connectOpen) => set({ connectOpen }),
  setRefCode: (refCode) => set({ refCode }),
  setReward: (reward) => set({ reward }),
  setRefreshing: (refreshing) => set({ refreshing }),
  logout: () => {
    clearSession();
    // Sign out sesi Agentic Wallet di server (fire-and-forget).
    // Setelah ini `baw auth signout` dijalankan → sign-in berikutnya wajib QR baru.
    try {
      fetch("/api/agentic/signout", { method: "POST" }).catch(() => undefined);
    } catch {
      /* ignore */
    }
    set({ user: null, tab: "mine", reward: null });
  },
}));
