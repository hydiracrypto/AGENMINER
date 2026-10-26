// ============================================
// AGENTIC MINER — Binance Agentic Wallet (SERVER-SIDE)
// Menjalankan CLI resmi Binance `baw` (npm @binance/agentic-wallet).
// Inilah pola yang dipakai ptah.trade:
//   1. `baw auth signin`   → qrCodeId + urlForWeb (https://app.binance.com/uni-qr/XXX) + pairingCode
//   2. `baw auth verify`   → blocking sampai user konfirmasi di Binance App (atau timeout ~5 menit)
//   3. `baw wallet address`→ alamat wallet (pilih EVM/BSC)
//   4. `baw auth signout`  → hapus sesi → login berikutnya WAJIB sign ulang
// CATATAN: CLI menyimpan SATU sesi global (~/.baw/session.json) per server —
// sign-in baru menggantikan QR lama (qrCodeId lama otomatis kedaluwarsa).
// Semua eksekusi ASYNC (spawn + promise) — tidak memblokir event loop Next.js.
// ============================================

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { registerUser } from "./create-user";
import { toPublicUser } from "./user-utils";
import type { PublicUser } from "./types";

// ---------- Resolusi binary baw ----------

function resolveBawBin(): string {
  const candidates = [
    process.env.BAW_BIN,
    // 1) Project-local (persisten via package.json — survive env reset/restart)
    "/home/z/my-project/node_modules/.bin/baw",
    // 2) CWD-relative (kalau project dipindah)
    `${process.cwd()}/node_modules/.bin/baw`,
    "/home/z/.npm-global/bin/baw",
    "/usr/local/bin/baw",
    "/usr/bin/baw",
  ].filter(Boolean) as string[];
  for (const c of candidates) if (existsSync(c)) return c;
  return "baw";
}

/** Lazy resolution setiap pemanggilan (existsSync sangat murah) — survive install ulang saat server jalan */
function bawBin(): string {
  return resolveBawBin();
}

interface BawJson {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code?: number; name?: string; message?: string };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Jalankan perintah baw sampai selesai (async, tidak memblokir event loop) */
function runBaw(args: string[], timeoutMs = 30_000): Promise<BawJson> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: BawJson) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    try {
      const child = spawn(bawBin(), args, {
        env: { ...process.env, HOME: process.env.HOME ?? "/home/z" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let errOut = "";
      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        done({ success: false, error: { name: "BAW_TIMEOUT", message: `baw ${args[0]} timed out` } });
      }, timeoutMs);
      child.stdout.on("data", (d: Buffer) => {
        out += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        errOut += d.toString();
      });
      child.on("close", () => {
        clearTimeout(timer);
        const trimmed = out.trim();
        if (!trimmed) {
          done({
            success: false,
            error: { name: "BAW_ERROR", message: errOut.trim() || `baw ${args[0]} returned no output` },
          });
          return;
        }
        try {
          done(JSON.parse(trimmed) as BawJson);
        } catch {
          done({ success: false, error: { name: "BAW_PARSE", message: trimmed.slice(0, 400) } });
        }
      });
      child.on("error", (e) => {
        clearTimeout(timer);
        done({ success: false, error: { name: "BAW_SPAWN", message: e.message } });
      });
    } catch (e) {
      done({ success: false, error: { name: "BAW_SPAWN", message: String(e) } });
    }
  });
}

// ---------- Sesi sign-in aktif (in-memory) ----------

export interface AgenticSession {
  qrCodeId: string;
  urlForWeb: string; // https://app.binance.com/uni-qr/XXXX — dipakai verbatim
  pairingCode: string;
  expireAt: number; // ms epoch
  refCode: string | null;
  createdAt: number;
  /** Promise background `baw auth verify` — resolve saat user konfirmasi / timeout */
  verify: Promise<{ ok: boolean; message?: string }>;
  /** Flag sinkron: true bila proses verify sudah selesai (sukses/gagal/timeout) */
  verifyDone: boolean;
  /** Proses verify child — dibunuh saat sesi digantikan/dibersihkan */
  verifyChild: ReturnType<typeof spawn> | null;
}

/** Cek sinkron tanpa await: apakah verify sesi ini masih menunggu? */
function isVerifyPending(s: AgenticSession): boolean {
  return !s.verifyDone && s.expireAt - Date.now() > 0;
}

const g = globalThis as unknown as { __agenticSession?: AgenticSession | null };
if (!g.__agenticSession) g.__agenticSession = null;

export function getAgenticSession(): AgenticSession | null {
  return g.__agenticSession ?? null;
}

export function clearAgenticSession() {
  const cur = g.__agenticSession;
  g.__agenticSession = null;
  if (cur && !cur.verifyDone && cur.verifyChild) {
    try {
      cur.verifyChild.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

// ---------- 1) auth signin ----------

/**
 * Mulai sesi sign-in baru:
 * - jalankan `baw auth signin --json`
 * - spawn `baw auth verify --qrCodeId X --json` di background (blocking, bisa 5 menit)
 * - simpan sesi global (sign-in baru menggantikan yang lama)
 */
export type StartResult =
  | { kind: "session"; session: AgenticSession; reused: boolean }
  | { kind: "already"; user: PublicUser; address: string }
  | { kind: "error"; message: string };

/**
 * Mulai sesi sign-in baru:
 * - jalankan `baw auth signin --json`
 * - bila CLI balas ALREADY_CONNECTED (sesi server masih hidup) → langsung
 *   ambil alamat + register → masuk tanpa QR
 * - spawn `baw auth verify --qrCodeId X --json` di background (blocking, bisa 5 menit)
 * - simpan sesi global (sign-in baru menggantikan yang lama)
 */
export async function startAgenticSignIn(refCode: string | null): Promise<StartResult> {
  // ── STABILITAS QR (pola ptah.trade) ──
  // Bila sesi sign-in masih pending & belum kedaluwarsa → PAKAI SESI YANG SAMA.
  // Retry klien (POST→GET→POST), klik ulang, atau request paralel TIDAK membuat
  // QR baru — QR yang sedang dilihat user tidak pernah dibatalkan mendadak.
  const cur = getAgenticSession();
  if (cur && isVerifyPending(cur)) {
    return { kind: "session", session: cur, reused: true };
  }

  // Sesi lama sudah mati/kedaluwarsa → bersihkan (bunuh verify child lama)
  if (cur) clearAgenticSession();

  const signin = await runBaw(["auth", "signin", "--json"], 30_000);
  if (!signin.success || !signin.data) {
    return { kind: "error", message: signin.error?.message ?? "auth signin failed" };
  }

  // Sesi masih hidup → langsung selesaikan login tanpa QR
  if (String(signin.data.status ?? "") === "ALREADY_CONNECTED") {
    const info = await fetchAgenticWalletInfo();
    if (!info.address) return { kind: "error", message: "connected session returned no address" };
    const user = await registerUser(info.address, refCode);
    return { kind: "already", user: toPublicUser(user), address: info.address };
  }

  const qrCodeId = String(signin.data.qrCodeId ?? "");
  const urlForWeb = String(signin.data.urlForWeb ?? "");
  const pairingCode = String(signin.data.pairingCode ?? "");
  const expireAt = Number(signin.data.expireAt ?? 0);
  if (!qrCodeId || !urlForWeb || !pairingCode) {
    return { kind: "error", message: "auth signin returned incomplete data" };
  }

  // Background verify — biarkan berjalan sampai user konfirmasi / timeout.
  // Flag sinkron `verifyDone` + referensi child untuk manajemen proses.
  let verifyDone = false;
  let verifyChild: ReturnType<typeof spawn> | null = null;
  const verify = new Promise<{ ok: boolean; message?: string }>((resolve) => {
    try {
      const child = spawn(bawBin(), ["auth", "verify", "--qrCodeId", qrCodeId, "--json"], {
        env: { ...process.env, HOME: process.env.HOME ?? "/home/z" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      verifyChild = child;
      let out = "";
      const finish = (r: { ok: boolean; message?: string }) => {
        verifyDone = true;
        resolve(r);
      };
      const timer = setTimeout(
        () => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* ignore */
          }
          finish({ ok: false, message: "timeout" });
        },
        6 * 60_000 // lebih panjang dari TTL CLI (5 menit) supaya CLI yang memutus lebih dulu
      );
      child.stdout.on("data", (d: Buffer) => {
        out += d.toString();
      });
      child.on("close", () => {
        clearTimeout(timer);
        try {
          const json = JSON.parse(out.trim()) as BawJson;
          if (json.success && json.data?.status === "SUCCESS") finish({ ok: true });
          else finish({ ok: false, message: json.error?.name ?? "AUTH_FAILED" });
        } catch {
          finish({ ok: false, message: "AUTH_FAILED" });
        }
      });
      child.on("error", () => {
        clearTimeout(timer);
        finish({ ok: false, message: "AUTH_FAILED" });
      });
    } catch {
      verifyDone = true;
      resolve({ ok: false, message: "AUTH_FAILED" });
    }
  });

  const session: AgenticSession = {
    qrCodeId,
    urlForWeb,
    pairingCode,
    expireAt,
    refCode: refCode?.trim().toUpperCase() || null,
    createdAt: Date.now(),
    verify,
    get verifyDone() {
      return verifyDone;
    },
    verifyChild,
  };
  g.__agenticSession = session; // gantikan sesi lama (QR lama menjadi tidak valid)
  return { kind: "session", session, reused: false };
}

// ---------- 2) wallet address ----------

export interface AgenticWalletInfo {
  address: string | null;
  agentId: string | null;
}

/** Ambil alamat wallet dari `baw wallet address` (prioritas BSC/chain 56, lalu EVM lain) */
export async function fetchAgenticWalletInfo(): Promise<AgenticWalletInfo> {
  // Tunggu status CONNECTED (setelah verify SUCCESS bisa sempat CREATING)
  for (let i = 0; i < 10; i++) {
    const st = await runBaw(["wallet", "status", "--json"], 15_000);
    const status = String(st?.data?.status ?? "");
    if (status === "CONNECTED") break;
    if (status === "UNCONNECTED") return { address: null, agentId: null };
    await sleep(1000); // CREATING → tunggu sebentar lalu coba lagi
  }

  const addr = await runBaw(["wallet", "address", "--json"], 20_000);
  let address: string | null = null;
  const addresses = (addr?.data?.addresses as Array<{ binanceChainId?: string; address?: string }> | undefined) ?? [];
  const evm = addresses.filter((a) => typeof a?.address === "string" && /^0x[a-fA-F0-9]{40}$/.test(a.address));
  const bsc = evm.find((a) => a.binanceChainId === "56");
  address = (bsc ?? evm[0])?.address?.toLowerCase() ?? null;

  // Agent ID (mis. "everhand.ai") — bila CLI mengeksposnya di settings
  let agentId: string | null = null;
  const settings = await runBaw(["wallet", "settings", "--json"], 20_000);
  if (settings?.success && settings.data) {
    const flat = JSON.stringify(settings.data);
    const m = flat.match(/"agentId"\s*:\s*"([^"]+)"/i);
    if (m) agentId = m[1];
  }

  return { address, agentId };
}

// ---------- 3) finalize: verify → address → register ----------

export type AgenticPollResult =
  | { status: "WAITING"; secondsLeft: number }
  | { status: "EXPIRED" }
  | { status: "SUCCESS"; user: PublicUser; address: string };

export async function pollAgenticSignIn(qrCodeId: string): Promise<AgenticPollResult> {
  const session = getAgenticSession();
  if (!session || session.qrCodeId !== qrCodeId) return { status: "EXPIRED" };

  const secondsLeft = Math.max(0, Math.floor((session.expireAt - Date.now()) / 1000));
  if (secondsLeft <= 0) {
    clearAgenticSession();
    return { status: "EXPIRED" };
  }

  // Verify sudah selesai tapi belum di-clear (mis. gagal cepat) → EXPIRED agar
  // client menampilkan tombol refresh, BUKAN menunggu selamanya.
  // (Verify sukses selalu tertangkap oleh Promise.race di bawah → SUCCESS.)
  if (session.verifyDone) {
    clearAgenticSession();
    return { status: "EXPIRED" };
  }

  // Non-blocking check: apakah verify sudah selesai?
  const settled = await Promise.race([
    session.verify.then((r) => ({ done: true as const, r })),
    new Promise<{ done: false }>((resolve) => setTimeout(() => resolve({ done: false }), 50)),
  ]);
  if (!settled.done) return { status: "WAITING", secondsLeft };

  clearAgenticSession();
  if (!settled.r.ok) return { status: "EXPIRED" };

  // SUCCESS di App → ambil alamat wallet
  const info = await fetchAgenticWalletInfo();
  if (!info.address) return { status: "EXPIRED" };
  const address = info.address;

  const user = await registerUser(address, session.refCode);
  return {
    status: "SUCCESS",
    user: toPublicUser(user),
    address,
  };
}

// ---------- 4) auth signout ----------

/** Hapus sesi Agentic Wallet di server → login berikutnya WAJIB scan/sign ulang */
export async function agenticSignOut(): Promise<boolean> {
  clearAgenticSession();
  const res = await runBaw(["auth", "signout", "--json"], 15_000);
  return Boolean(res?.success);
}

/** Status koneksi saat ini (untuk badge UI bila diperlukan) */
export async function agenticStatus(): Promise<"CONNECTED" | "UNCONNECTED" | "CREATING" | "UNKNOWN"> {
  const st = await runBaw(["wallet", "status", "--json"], 10_000);
  const s = String(st?.data?.status ?? "");
  if (s === "CONNECTED" || s === "UNCONNECTED" || s === "CREATING") return s;
  return "UNKNOWN";
}
