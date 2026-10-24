// ============================================
// AGENTIC MINER — API Client (frontend → backend)
// ============================================

import type {
  GlobalStats,
  LeaderboardRow,
  MineResult,
  PublicUser,
  RecentMine,
  WithdrawalItem,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error ?? `HTTP ${res.status}`) as Error & {
      remainingMs?: number;
      status?: number;
    };
    err.remainingMs = (data as { remainingMs?: number })?.remainingMs;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export const api = {
  login: (address: string, refCode?: string) =>
    jsonFetch<{ user: PublicUser; isNew: boolean }>("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ address, refCode }),
    }),

  getUser: (address: string) =>
    jsonFetch<{ user: PublicUser; recentMines: RecentMine[]; withdrawals: WithdrawalItem[] }>(
      `/api/user/${address}`
    ),

  mine: (address: string, prompt: string) =>
    jsonFetch<MineResult & { refCommission?: number }>("/api/mine", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ address, prompt }),
    }),

  boost: (address: string, action: "upgrade" | "checkin") =>
    jsonFetch<{ user: PublicUser; message: string; reward?: number; streak?: number }>("/api/boost", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ address, action }),
    }),

  withdraw: (address: string, amount: number) =>
    jsonFetch<{ user: PublicUser; message: string }>("/api/withdraw", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ address, amount }),
    }),

  leaderboard: (me?: string) =>
    jsonFetch<{ rows: LeaderboardRow[]; meRank: number }>(
      `/api/leaderboard${me ? `?me=${encodeURIComponent(me)}` : ""}`
    ),

  stats: () => jsonFetch<GlobalStats>("/api/stats"),
};
