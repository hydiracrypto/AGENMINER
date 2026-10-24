// ============================================
// AGENTIC MINER — Auto-Mint Engine (SERVER-SIDE ONLY)
// Penarikan game-balance → mint otomatis ke wallet BNB Chain.
//
// Mode:
// 1. "onchain"  — jika TOKEN.contractAddress + MINTER_KEY (env) sudah diisi:
//                 backend memanggil fungsi kontrak `mintWithdrawal(to, net, feeBps)`
//                 → net di-mint ke wallet user, feeBps di-mint ke pair PancakeSwap.
// 2. "simulated" — default sebelum kontrak aktif: mint dicatat langsung di DB
//                 (status MINTED instan) dan antrian on-chain dieksekusi
//                 otomatis begitu kontrak + key dikonfigurasi.
// ============================================

import { TOKEN, WITHDRAW, PANCAKESWAP } from "./game-config";

export interface MintResult {
  ok: boolean;
  mode: "onchain" | "simulated";
  txHash: string | null;
  error?: string;
}

function isOnchainConfigured(): boolean {
  return Boolean(TOKEN.contractAddress && process.env.MINTER_KEY);
}

/**
 * Mint AGENMINER hasil penarikan:
 * - net  → wallet user (BEP-20 di BNB Chain)
 * - fee  → likuiditas PancakeSwap (pair AGENMINER/BNB) via feeBps di kontrak
 */
export async function mintWithdrawalOnchain(
  to: string,
  netTokens: number,
  feeTokens: number
): Promise<MintResult> {
  if (!isOnchainConfigured()) {
    // Mode simulasi: mint tercatat di DB, instan, tanpa gas.
    return { ok: true, mode: "simulated", txHash: null };
  }

  try {
    const { ethers } = await import("ethers");
    const provider = new ethers.JsonRpcProvider(TOKEN.rpcUrl);
    const signer = new ethers.Wallet(process.env.MINTER_KEY as string, provider);

    const ABI = [
      "function mintWithdrawal(address to, uint256 amount, uint16 feeBps) external",
    ];
    const contract = new ethers.Contract(TOKEN.contractAddress, ABI, signer);

    const amountWei = ethers.parseUnits(
      (netTokens + feeTokens).toFixed(TOKEN.decimals),
      TOKEN.decimals
    );
    const feeBps = Math.round(WITHDRAW.feePct * 100); // 10% → 1000 bps

    const tx = await contract.mintWithdrawal(to, amountWei, feeBps);
    const receipt = await tx.wait();
    return { ok: true, mode: "onchain", txHash: receipt?.hash ?? tx.hash };
  } catch (err) {
    console.error("[onchain-mint] gagal mint on-chain:", err);
    return {
      ok: false,
      mode: "onchain",
      txHash: null,
      error: err instanceof Error ? err.message : "mint_failed",
    };
  }
}

/** Info mode penarikan aktif — untuk ditampilkan di UI/API */
export function withdrawMode(): { autoMint: boolean; mode: "onchain" | "simulated"; dex: string; pair: string } {
  return {
    autoMint: WITHDRAW.autoMint,
    mode: isOnchainConfigured() ? "onchain" : "simulated",
    dex: PANCAKESWAP.dex,
    pair: PANCAKESWAP.pair || TOKEN.contractAddress,
  };
}
