// ============================================
// AGENTIC MINER — Zustand Store (client state)
// ============================================

"use client";

import { create } from "zustand";
import type { MineResult, PublicUser } from "./types";

export type GameTab = "mine" | "boost" | "friends" | "rank" | "wallet";

interface GameState {
  user: PublicUser | null;
  tab: GameTab;
  connectOpen: boolean;
  reward: MineResult | null;
  refreshing: boolean;
  setUser: (u: PublicUser | null) => void;
  setTab: (t: GameTab) => void;
  setConnectOpen: (open: boolean) => void;
  setReward: (r: MineResult | null) => void;
  setRefreshing: (b: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  tab: "mine",
  connectOpen: false,
  reward: null,
  refreshing: false,
  setUser: (user) => set({ user }),
  setTab: (tab) => set({ tab }),
  setConnectOpen: (connectOpen) => set({ connectOpen }),
  setReward: (reward) => set({ reward }),
  setRefreshing: (refreshing) => set({ refreshing }),
}));
