// ============================================
// AGENTIC MINER — API Client (frontend → backend)
// RESILIENT: tahan gangguan jaringan/proxy.
// Strategi untuk setiap permintaan POST (5 percobaan, selang-seling):
//   POST → GET ?params → POST → GET ?params → POST
// - Respons non-JSON (HTML 410/502 "Recycled" proxy, koneksi putus, timeout) =
//   TransportError → di-retry.
// - JSON diparse TANPA peduli content-type (proxy kadang menulis-ulang header).
// - Error API yang sah (JSON 4xx/5xx) TIDAK di-retry — langsung dilempar.
// TransportError.kind → dipakai UI untuk pesan yang jujur (offline / halaman lama).
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
class TransportError extends Error {
  /** "network" | "timeout" | "http-<status>-html" | "bad-json" */
  kind: string;
  constructor(kind: string) {
    super(kind);
    this.kind = kind;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Satu percobaan fetch — melempar TransportError untuk gangguan transport */
async function tryFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // Timeout manual (AbortController — kompatibel browser lama): request yang
    // menggantung di gateway/proxy diubah menjadi TransportError → di-retry.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20_000);
    res = await fetch(url, { ...init, signal: ac.signal }).finally(() => clearTimeout(timer));
  } catch {
    // koneksi putus / DNS / offline / timeout
    throw new TransportError(
      typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network"
    );
  }
  // JSON diparse TANPA peduli content-type — proxy kadang menulis-ulang header
  // (mis. application/json → text/html) padahal body JSON sah.
  const raw = await res.text().catch(() => "");
  let data: Record<string, unknown> | null = null;
  try {
    const v = JSON.parse(raw);
    if (typeof v === "object" && v !== null) data = v as Record<string, unknown>;
  } catch {
    data = null;
  }
  if (data === null) {
    // Body HTML/bukan-JSON (mis. halaman "Recycled"/410/502 dari proxy) — retriable
    throw new TransportError(`http-${res.status}-html`);
  }
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

/** Fetch tangguh: POST → GET → POST → GET → POST (5 percobaan).
 *  Setiap percobaan memakai URL unik (_t = cache-buster) supaya gateway/proxy
 *  TIDAK menyajikan respons basi yang ter-cache (penyebab error "Couldn't
 *  reach the Binance network" yang terus muncul walau server sehat). */
async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isPost = init?.method === "POST";
  const bodyObj = isPost && typeof init?.body === "string" ? safeParse(init.body) : null;
  if (!isPost || !bodyObj) return tryFetch<T>(url, init);

  const bust = () => `_t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sep = url.includes("?") ? "&" : "?";
  const backoff = [500, 900, 1400, 2000];
  let lastErr: unknown;

  for (let i = 0; i < 5; i++) {
    if (i > 0) await sleep(backoff[Math.min(i - 1, backoff.length - 1)]);
    const postUrl = `${url}${sep}${bust()}-p${i}`;
    const qs = new URLSearchParams(bodyObj as Record<string, string>).toString();
    const getUrl = `${url}${sep}${qs}&${bust()}-g${i}`;
    try {
      return i % 2 === 0
        ? await tryFetch<T>(postUrl, init)
        : await tryFetch<T>(getUrl, { method: "GET" });
    } catch (e) {
      if (!(e instanceof TransportError)) throw e; // error API sah — jangan di-retry
      lastErr = e;
    }
  }
  throw lastErr;
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
  /** Mulai sign-in Agentic Wallet (tahan gangguan proxy — POST→GET→POST).
   *  force=true (default): aksi user → QR + pairing code BARU setiap connect
   *  (pola ptah.trade). Rantai retry otomatis via GET bridge selalu non-force,
   *  jadi QR yang sedang dilihat user tidak digantikan. */
  agenticStart: (refCode?: string | null, force = true) =>
    jsonFetch<AgenticStartData>("/api/wallet/start", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ refCode: refCode ?? null, force }),
    }),

  /** Batalkan sesi sign-in pending di server (fire-and-forget, keepalive).
   *  Dipanggil saat user menekan "Cancel connection" / menutup modal —
   *  connect berikutnya PASTI menghasilkan QR + pairing code baru. */
  agenticCancel: () => {
    try {
      void fetch(`/api/wallet/start?_t=${Date.now()}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      /* ignore */
    }
  },

  /** Sign out sesi Agentic Wallet di server (fire-and-forget friendly) */
  agenticSignout: () => jsonFetch<{ ok: boolean }>("/api/wallet/signout", { method: "POST" }),

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
