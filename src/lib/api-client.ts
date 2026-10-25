// ============================================
// AGENTIC MINER — API Client (frontend → backend)
// RESILIENT: tahan gangguan jaringan/proxy.
// Strategi untuk setiap permintaan POST:
//   1. POST JSON
//   2. gagal jaringan/proxy (HTML 410/502, koneksi putus) → tunggu → GET ?params
//   3. gagal lagi → tunggu → POST sekali lagi
// Error API yang sah (JSON 400/403/404/500) TIDAK di-retry — langsung dilempar.
// ============================================

import type {
  GlobalStats,
  LeaderboardRow,
  MineResult,
  PublicUser,
  RecentMine,
  WithdrawalItem,
} from "./types";

/** Kegagalan transport (bukan error API) — layak di-retry / fallback GET */
class TransportError extends Error {}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Satu percobaan fetch — melempar TransportError untuk gangguan transport */
async function tryFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // Timeout manual (AbortController — kompatibel browser lama): request yang
    // menggantung di gateway/proxy diubah menjadi TransportError → di-retry.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12_000);
    res = await fetch(url, { ...init, signal: ac.signal }).finally(() => clearTimeout(timer));
  } catch {
    // koneksi putus / DNS / offline / timeout
    throw new TransportError("network");
  }
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  if (!isJson) {
    // Respons HTML (mis. halaman "Recycled"/410/502 dari proxy) — retriable
    throw new TransportError(`http-${res.status}-html`);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = new Error((data.error as string) ?? `HTTP ${res.status}`) as Error & {
      remainingMs?: number;
      status?: number;
      errorKey?: string;
    };
    err.remainingMs = data.remainingMs as number | undefined;
    err.errorKey = data.errorKey as string | undefined;
    err.status = res.status;
    throw err; // error API sah — TIDAK di-retry
  }
  return data as T;
}

/** Fetch tangguh: POST → GET fallback → POST ulang */
async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isPost = init?.method === "POST";
  const bodyObj = isPost && typeof init?.body === "string" ? safeParse(init.body) : null;

  // 1) percobaan asli
  try {
    return await tryFetch<T>(url, init);
  } catch (e) {
    if (!(e instanceof TransportError) || !isPost || !bodyObj) throw e;
  }

  // 2) fallback GET dengan query params (melewati proxy yang bermasalah dgn POST)
  await sleep(600);
  try {
    const qs = new URLSearchParams(bodyObj as Record<string, string>).toString();
    const sep = url.includes("?") ? "&" : "?";
    return await tryFetch<T>(`${url}${sep}${qs}`, { method: "GET" });
  } catch (e) {
    if (!(e instanceof TransportError)) throw e;
  }

  // 3) POST ulang sekali terakhir
  await sleep(900);
  return tryFetch<T>(url, init);
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export interface AgenticStartData {
  qrCodeId: string;
  urlForWeb: string;
  pairingCode: string;
  expireAt: number;
  secondsLeft: number;
  /** QR PNG data-url dari server (tampil instan — tanpa render di browser) */
  qrDataUrl?: string;
  alreadyConnected?: boolean;
  user?: PublicUser;
  address?: string;
}

export const api = {
  /** Mulai sign-in Agentic Wallet (tahan gangguan proxy — POST→GET→POST) */
  agenticStart: (refCode?: string | null) =>
    jsonFetch<AgenticStartData>("/api/agentic/start", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ refCode: refCode ?? null }),
    }),

  /** Sign out sesi Agentic Wallet di server (fire-and-forget friendly) */
  agenticSignout: () => jsonFetch<{ ok: boolean }>("/api/agentic/signout", { method: "POST" }),

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

  mine: (address: string, prompt: string, lang: "zh" | "en" = "zh") =>
    jsonFetch<MineResult & { refCommission?: number }>("/api/mine", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ address, prompt, lang }),
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
