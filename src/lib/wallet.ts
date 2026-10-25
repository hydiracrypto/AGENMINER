// ============================================
// AGENTIC MINER — Wallet Utils (CLIENT-SIDE)
// Integrasi Binance Agentic Wallet / Binance Web3 Wallet
// via EIP-6963 + injected provider + fallback demo.
// ============================================

import { TOKEN, isValidEvmAddress } from "./game-config";

// ---------- EIP-1193 / EIP-6963 minimal types ----------

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

// Pakai intersection (bukan extends) karena deklarasi global pihak ketiga
// bisa menjadikan Window.ethereum/binancew3w required dan menimbulkan konflik.
type WindowWithProviders = Window & {
  binancew3w?: EIP1193Provider | undefined;
  ethereum?: (EIP1193Provider & { isMetaMask?: boolean; isBinance?: boolean }) | undefined;
};

// ---------- EIP-6963 discovery ----------

export function discoverWallets(timeoutMs = 400): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve([]);
    const found: EIP6963ProviderDetail[] = [];
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      if (detail?.info && detail?.provider) {
        // hindari duplikat rdns
        if (!found.some((w) => w.info.rdns === detail.info.rdns)) {
          found.push(detail);
        }
      }
    };
    window.addEventListener("eip6963:announceProvider", handler);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", handler);
      resolve(found);
    }, timeoutMs);
  });
}

/** Deteksi wallet Binance (injected) sebagai fallback jika EIP-6963 tidak ada */
export function getBinanceInjected(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithProviders;
  if (w.binancew3w) return w.binancew3w;
  if (w.ethereum?.isBinance) return w.ethereum;
  return null;
}

export interface WalletOption {
  id: string; // "binance" | rdns | "binancew3w" | "ethereum" | "demo"
  name: string;
  icon?: string;
  rdns?: string;
  provider?: EIP1193Provider;
  isBinance: boolean;
}

/** Kumpulkan semua opsi koneksi wallet yang tersedia di browser */
export async function getWalletOptions(): Promise<WalletOption[]> {
  const options: WalletOption[] = [];
  const seen = new Set<string>();

  // 1) EIP-6963 (prioritas, standar multi-wallet)
  const eip6963 = await discoverWallets();
  for (const d of eip6963) {
    if (!seen.has(d.info.rdns)) {
      seen.add(d.info.rdns);
      const isBinance = /binance/i.test(d.info.rdns) || /binance/i.test(d.info.name);
      options.push({
        id: d.info.rdns,
        name: d.info.name,
        icon: d.info.icon,
        rdns: d.info.rdns,
        provider: d.provider,
        isBinance,
      });
    }
  }

  // 2) Injected fallback
  const binanceInjected = getBinanceInjected();
  if (binanceInjected && !options.some((o) => o.isBinance)) {
    options.unshift({ id: "binancew3w", name: "Binance Wallet", provider: binanceInjected, isBinance: true });
  }

  const w = window as WindowWithProviders;
  if (w.ethereum && !options.some((o) => o.provider === w.ethereum)) {
    options.push({ id: "ethereum", name: "Wallet Browser", provider: w.ethereum, isBinance: false });
  }

  // Binance dulu
  options.sort((a, b) => Number(b.isBinance) - Number(a.isBinance));
  return options;
}

// ---------- Chain helpers ----------

export async function ensureBnbChain(provider: EIP1193Provider): Promise<boolean> {
  try {
    const chainId = (await provider.request({ method: "eth_chainId" })) as string;
    if (chainId?.toLowerCase() === TOKEN.chainIdHex) return true;
    // coba switch ke BNB Chain mainnet
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TOKEN.chainIdHex }],
      });
      return true;
    } catch (switchErr) {
      // chain belum ada di wallet → tambahkan
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: TOKEN.chainIdHex,
              chainName: TOKEN.chainName,
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: [TOKEN.rpcUrl],
              blockExplorerUrls: [TOKEN.explorer],
            },
          ],
        });
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

export async function connectProvider(provider: EIP1193Provider): Promise<string> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0) throw new Error("Tidak ada akun yang diizinkan");
  const address = accounts[0];
  if (!isValidEvmAddress(address)) throw new Error("Alamat wallet tidak valid");
  await ensureBnbChain(provider);
  return address.toLowerCase();
}

// ---------- Session ----------

export interface MinerSession {
  address: string;
  walletName: string;
  loginAt: number;
}

const SESSION_KEY = "agenminer:session";

export function saveSession(s: MinerSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadSession(): MinerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as MinerSession;
    if (!s?.address || !isValidEvmAddress(s.address)) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- Agentic ID NFT pre-check (CLIENT) ----------
// Server tetap memverifikasi ulang di /api/auth/login (sumber kebenaran).
export interface AgentIdProbe {
  hasNft: boolean;
  balance: number;
  trusted: boolean;
}

export async function probeAgentId(address: string): Promise<AgentIdProbe> {
  try {
    const res = await fetch(`/api/agent-id?address=${address.toLowerCase()}`);
    if (!res.ok) return { hasNft: false, balance: 0, trusted: false };
    const d = (await res.json()) as { hasNft?: boolean; balance?: number; trusted?: boolean };
    return { hasNft: Boolean(d.hasNft), balance: Number(d.balance ?? 0), trusted: Boolean(d.trusted) };
  } catch {
    return { hasNft: false, balance: 0, trusted: false };
  }
}
