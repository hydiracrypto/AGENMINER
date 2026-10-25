// ============================================
// AGENTIC MINER — Agentic ID NFT Gate (SERVER-SIDE)
// Verifikasi holder NFT "SPACE ID Agent ID" (BEP-721 soulbound) di BNB Chain.
// Dipakai oleh /api/auth/login, /api/pair/approve, /api/agent-id.
// ============================================

import { AGENTIC_ID, isValidEvmAddress } from "./game-config";

// selector balanceOf(address)
const BALANCE_OF = "0x70a08231";

type CacheEntry = { hasNft: boolean; balance: number; at: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 120_000; // 2 menit — transaksi claim NFT jarang & cek ulang cukup cepat

/** Panggil eth_call balanceOf ke salah satu RPC publik (fallback berurutan) */
async function rpcBalanceOf(address: string): Promise<number | null> {
  const data = BALANCE_OF + address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  for (const rpc of AGENTIC_ID.rpcs) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: AGENTIC_ID.contract, data }, "latest"],
        }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: string; error?: unknown };
      const hex = json?.result;
      if (typeof hex === "string" && /^0x[0-9a-f]+$/i.test(hex)) {
        return Number(BigInt(hex));
      }
    } catch {
      // RPC gagal/timeout → coba berikutnya
    }
  }
  return null;
}

export interface AgentIdCheck {
  ok: boolean; // true = boleh masuk
  hasNft: boolean;
  balance: number;
  whitelisted: boolean;
  trusted: boolean; // false = semua RPC gagal (jangan blokir user karena error infra)
}

/**
 * Cek apakah alamat memegang NFT Agentic ID.
 * - Whitelist → langsung lolos.
 * - Hasil RPC di-cache 2 menit per alamat.
 * - Kalau SEMUA RPC gagal → trusted=false (pemanggil memutuskan: default tolak
 *   untuk pendaftaran baru, default izinkan untuk sesi verifikasi ulang agar
 *   gangguan infrastruktur tidak mengunci seluruh user).
 */
export async function checkAgentId(rawAddress: string): Promise<AgentIdCheck> {
  const address = rawAddress.trim().toLowerCase();
  const invalid: AgentIdCheck = { ok: false, hasNft: false, balance: 0, whitelisted: false, trusted: false };
  if (!isValidEvmAddress(address)) return invalid;

  const whitelisted = (AGENTIC_ID.whitelist as readonly string[]).includes(address);
  if (whitelisted) {
    return { ok: true, hasNft: true, balance: 1, whitelisted, trusted: true };
  }

  const cached = CACHE.get(address);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ok: cached.hasNft, hasNft: cached.hasNft, balance: cached.balance, whitelisted: false, trusted: true };
  }

  const balance = await rpcBalanceOf(address);
  if (balance === null) {
    // Semua RPC gagal — jangan cache hasil negatif
    return { ok: false, hasNft: false, balance: 0, whitelisted: false, trusted: false };
  }

  const hasNft = balance > 0;
  CACHE.set(address, { hasNft, balance, at: Date.now() });
  return { ok: hasNft, hasNft, balance, whitelisted: false, trusted: true };
}
