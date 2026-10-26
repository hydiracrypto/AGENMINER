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

export interface BawLaunch {
  /** argv[0] — process.execPath utk file JS vendor, atau path binary langsung */
  cmd: string;
  /** Argumen pendahulu (path JS entry saat dijalankan via execPath) */
  prefixArgs: string[];
  /** Sumber resolusi — untuk logging/debug */
  src: string;
}

/**
 * Resolusi CARA MENJALANKAN CLI baw — tahan deployment.
 * Masalah empiris (agenminer.space-z.ai): build production standalone TIDAK
 * menyertakan @binance/agentic-wallet (spawn dinamis tidak ter-trace oleh NFT)
 * → spawn("baw") gagal → "Couldn't reach the Binance network".
 * Solusi: package di-VENDOR ke repo (vendor/agentic-wallet, ikut ter-commit &
 * ter-deploy) dan dijalankan via process.execPath — runtime server pasti ada.
 */
function resolveBawLaunch(): BawLaunch {
  // 0) Override eksplisit (binary executable langsung)
  const envBin = process.env.BAW_BIN;
  if (envBin && existsSync(envBin)) {
    return { cmd: envBin, prefixArgs: [], src: "env:BAW_BIN" };
  }
  // 1) Kandidat file JS entry CLI — dijalankan via process.execPath
  //    (node/bun yang menjalankan server; CLI = JS murni + deps nested)
  const jsCandidates = [
    // Vendor SELF-CONTAINED dalam repo (bun install --production di vendor/) —
    // ikut ter-commit & ter-deploy; cwd project root / standalone ber-tracing
    `${process.cwd()}/vendor/node_modules/@binance/agentic-wallet/dist/index.js`,
    // cwd standalone build (.next/standalone) → project root DUA level di atas
    `${process.cwd()}/../../vendor/node_modules/@binance/agentic-wallet/dist/index.js`,
    // Path absolut sandbox (dev)
    "/home/z/my-project/vendor/node_modules/@binance/agentic-wallet/dist/index.js",
    // Instalasi project via bun add (fallback dev)
    "/home/z/my-project/node_modules/@binance/agentic-wallet/dist/index.js",
    `${process.cwd()}/node_modules/@binance/agentic-wallet/dist/index.js`,
    // Layout vendor lama (copy manual) — fallback bila masih ada
    `${process.cwd()}/vendor/agentic-wallet/dist/index.js`,
    `${process.cwd()}/../vendor/agentic-wallet/dist/index.js`,
  ];
  for (const js of jsCandidates) {
    if (existsSync(js)) return { cmd: process.execPath, prefixArgs: [js], src: js };
  }
  // 2) Shim .bin / global — spawn langsung (butuh shebang + node di PATH)
  const binCandidates = [
    "/home/z/my-project/node_modules/.bin/baw",
    `${process.cwd()}/node_modules/.bin/baw`,
    "/home/z/.npm-global/bin/baw",
    "/usr/local/bin/baw",
    "/usr/bin/baw",
  ];
  for (const b of binCandidates) {
    if (existsSync(b)) return { cmd: b, prefixArgs: [], src: b };
  }
  // 3) Harap PATH sistem
  return { cmd: "baw", prefixArgs: [], src: "PATH" };
}

interface BawJson {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code?: number; name?: string; message?: string };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Log sumber launcher sekali per proses — memudahkan diagnosis deployment */
let bawSrcLogged = false;

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
      const launch = resolveBawLaunch();
      if (!bawSrcLogged) {
        bawSrcLogged = true;
        console.log(`[baw] launcher="${launch.src}" prefix=${JSON.stringify(launch.prefixArgs)}`);
      }
      const child = spawn(launch.cmd, [...launch.prefixArgs, ...args], {
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
export async function startAgenticSignIn(
  refCode: string | null,
  opts?: { force?: boolean }
): Promise<StartResult> {
  // ── FORCE (aksi user: klik sign-in / Retry / refresh code / setelah cancel) ──
  // Pola ptah.trade: setiap connect baru dari user = QR + pairing code BARU.
  if (opts?.force) {
    clearAgenticSession();
    // CLI `auth signin` mengembalikan QR PENDING yang SAMA selama masih berlaku
    // (terbukti empiris) — agar pairing benar-benar berubah, sesi pending CLI
    // harus dibersihkan dulu. TAPI jangan pernah signout sesi yang masih
    // CONNECTED (kalau connected, signin di bawah langsung balas
    // ALREADY_CONNECTED → login instan tanpa QR).
    const st = await runBaw(["wallet", "status", "--json"], 8_000);
    if (st.success && String(st.data?.status ?? "") === "UNCONNECTED") {
      await runBaw(["auth", "signout", "--json"], 8_000);
    }
  } else {
    // ── NON-FORCE (retry OTOMATIS klien: POST→GET→POST) ──
    // Bila sesi sign-in masih pending & belum kedaluwarsa → PAKAI SESI YANG SAMA,
    // supaya rantai retry tidak menghancurkan QR yang sedang dilihat user.
    const cur = getAgenticSession();
    if (cur && isVerifyPending(cur)) {
      return { kind: "session", session: cur, reused: true };
    }
  }

  // Sesi in-memory lama (jika masih ada sisa) → bersihkan (bunuh verify child lama)
  clearAgenticSession();

  const signin = await runBaw(["auth", "signin", "--json"], 30_000);
  if (!signin.success || !signin.data) {
    return { kind: "error", message: signin.error?.message ?? "auth signin failed" };
  }

  // Sesi masih hidup → langsung selesaikan login tanpa QR
  if (String(signin.data.status ?? "") === "ALREADY_CONNECTED") {
    const info = await fetchAgenticWalletInfo();
    if (!info.address) return { kind: "error", message: "connected session returned no address" };
    // agentId asli Binance (mis. "everhand.ai") → username ikut ID Agen pemilik wallet
    const user = await registerUser(info.address, refCode, info.agentId);
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
      const launch = resolveBawLaunch();
      const child = spawn(launch.cmd, [...launch.prefixArgs, "auth", "verify", "--qrCodeId", qrCodeId, "--json"], {
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
  /** Binance Agent ID ASLI milik akun, mis. "everhand.ai" (dipakai sbg username) */
  agentId: string | null;
}

/**
 * Ekstrak Agent ID dari respons CLI (`baw wallet agent-id` / `baw wallet settings`).
 * Shape terkonfirmasi (empiris): { claimed: true, handle: "everhand", agentId: "everhand.ai" }.
 * Normalisasi: lowercase + pastikan berakhiran ".ai" (format Agent ID Binance).
 */
function extractAgentId(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  // Bila flag `claimed` eksplisit false → akun belum klaim Agent ID
  if (data.claimed === false) return null;
  const flat = JSON.stringify(data);
  const m = flat.match(/"(?:agentId|agent_id|handle|domain)"\s*:\s*"([^"]{2,64})"/i);
  if (!m) return null;
  let id = m[1].trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*(\.ai)?$/.test(id)) return null;
  if (!id.endsWith(".ai")) id = `${id}.ai`;
  return id;
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

  // Agent ID ASLI (mis. "everhand.ai") — sumber utama: perintah resmi `wallet agent-id`
  let agentId: string | null = null;
  const claimed = await runBaw(["wallet", "agent-id", "--json"], 15_000);
  if (claimed?.success) {
    agentId = extractAgentId(claimed.data);
  }
  // Fallback: scraping field agentId dari `wallet settings` (bila agent-id gagal)
  if (!agentId) {
    const settings = await runBaw(["wallet", "settings", "--json"], 20_000);
    if (settings?.success && settings.data) {
      agentId = extractAgentId(settings.data);
    }
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

  // agentId asli Binance (mis. "everhand.ai") → username ikut ID Agen pemilik wallet
  const user = await registerUser(address, session.refCode, info.agentId);
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
