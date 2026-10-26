// ============================================
// AGENTIC MINER — Konfigurasi Token & Formula Game
// ============================================

export const TOKEN = {
  name: "AGENTIC MINER",
  symbol: "AGENMINER",
  emoji: "⛏️",
  decimals: 18,
  totalSupply: 100_000_000, // 100 juta
  miningPool: 70_000_000, // 70% pool mining
  teamTreasury: 10_000_000, // 10% tim & treasury
  marketing: 10_000_000, // 10% marketing
  liquidity: 10_000_000, // 10% likuiditas DEX
  chainId: 56, // BNB Smart Chain Mainnet
  chainIdHex: "0x38",
  chainName: "BNB Smart Chain",
  chainShort: "BNB Chain",
  rpcUrl: "https://bsc-dataseed.binance.org",
  explorer: "https://bscscan.com",
  // ⚠️ Isi alamat kontrak BEP-20 setelah deploy (lihat contracts/DEPLOY_GUIDE.md)
  contractAddress: "",
} as const;

// ============================================
// PENARIKAN OTOMATIS — AUTO MINT + FEE LIKUIDITAS PANCAKESWAP
// ============================================
export const WITHDRAW = {
  autoMint: true, // penarikan langsung di-mint otomatis ke wallet BNB Chain user
  feePct: 5, // 5% fee penarikan → masuk likuiditas DEX PancakeSwap
} as const;

/** PancakeSwap (BNB Smart Chain / chain 56) */
export const PANCAKESWAP = {
  dex: "PancakeSwap V2",
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
  // Pair AGENMINER/BNB — isi setelah pair dibuat (lihat contracts/DEPLOY_GUIDE.md)
  pair: "",
} as const;

/**
 * Pecahkan jumlah penarikan → net ke wallet + fee ke likuiditas PancakeSwap.
 * Matematika DIJAMIN identik dengan kontrak `mintWithdrawal`:
 *   fee = amount_wei x feeBps / 10000 (pembagian bulat di level wei).
 * Amount dikuantisasi ke 2 desimal (floor — tidak pernah melebihi input),
 * lalu fee dihitung eksak 4 desimal, sehingga catatan DB (fee/net) selalu
 * persis sama dengan pembagian on-chain (deviasi 0.528 vs 0.53 hilang).
 */
export function splitWithdrawal(amount: number): { net: number; fee: number } {
  const amt = Math.floor(amount * 100 + 1e-9) / 100; // kuantisasi 2 desimal, anti float-noise
  if (amt <= 0) return { net: 0, fee: 0 };
  const fee = Math.round(amt * WITHDRAW.feePct * 100) / 10000; // eksak 4 desimal (mis. 0.528)
  const net = Math.round((amt - fee) * 10000) / 10000;
  return { net, fee };
}

// ============================================
// EKONOMI DISTRIBUSI ADIL (permintaan owner):
// - Cap lifetime 7.000 AGENMINER per wallet utk SEMUA reward game
//   (mining AI prompt + check-in + komisi referral + bonus join).
// - Pool 70.000.000 ÷ 7.000 = MAKSIMAL 10.000 holder full-cap →
//   pool terjamin terbagi ke 7.000–10.000 wallet holder.
// - Wallet TANPA Agent ID Binance asli (verifiedAgent=false):
//   cooldown 5 menit + reward 50% → perolehan lebih lambat & adil.
// - Mining Power Lv 1–10 (hard cap) + kurva biaya eksponensial 1,65x
//   per level → token terbakar di upgrade TIDAK bisa ditarik, jadi
//   wallet pemburu level tinggi otomatis menyerahkan hampir semua
//   jatahnya (Lv6 = 99% cap terbakar; Lv7+ matematis mustahil).
// ============================================
export const GAME = {
  cooldownMs: 60_000, // jeda antar mining (wallet dgn Agent ID): 60 detik
  minPromptLen: 15,
  maxPromptLen: 500,
  baseReward: 25, // reward dasar per mining
  scoreMultiplier: 0.6, // bonus = skor AI (0-100) x 0.6
  streakBonusPerDay: 0.05, // +5% per hari streak
  maxStreakBonus: 0.5, // maksimal +50%
  referrerJoinBonus: 500, // bonus undangan untuk pengundang (ikut cap 7.000)
  refCommission: 0.02, // komisi 2% dari reward (diturunkan dr 5% agar pool tahan sampai 7.000-10.000 holder)
  checkinBaseReward: 100, // reward check-in harian dasar
  minWithdraw: 0, // TANPA minimal penarikan — tarik berapa pun!
  recentPromptLimit: 10, // cek duplikat 10 prompt terakhir
  perWalletCap: 7_000, // cap lifetime reward per wallet (semua sumber reward)
  noAgentIdCooldownMs: 300_000, // wallet TANPA Agent ID: cooldown 5 menit
  noAgentIdRewardMult: 0.5, // wallet TANPA Agent ID: reward 50%
  maxMiningPower: 10, // Mining Power Lv 1–10 — di atas itu tidak bisa upgrade
} as const;

/** Cooldown efektif per wallet: 60 dtk (verified Agent ID) / 5 mnt (tanpa) */
export function effectiveCooldownMs(verifiedAgent: boolean): number {
  return verifiedAgent ? GAME.cooldownMs : GAME.noAgentIdCooldownMs;
}

/** Sisa jatah lifetime wallet terhadap cap 7.000 */
export function remainingCap(totalMined: number): number {
  return Math.max(0, GAME.perWalletCap - totalMined);
}

/** Clamp jumlah reward agar totalMined tidak melampaui cap 7.000 */
export function clampToCap(totalMined: number, amount: number): number {
  return Math.max(0, Math.min(amount, remainingCap(totalMined)));
}

/**
 * Biaya upgrade Mining Power ke level berikutnya (Lv 1–10, hard cap).
 * Kurva eksponensial 1,65x per level — JAUH lebih sulit dari kurva lama
 * (750 x p^1.6). Token yang dibakar di upgrade tidak bisa ditarik, jadi
 * dengan cap lifetime 7.000/wallet:
 *   Lv5 kumulatif 3.946 (56% cap terbakar) • Lv6 kumulatif 6.911 (99%,
 *   level trofi — sisa withdraw cuma ~89) • Lv7 kumulatif 11.803 →
 *   matematis mustahil dicapai.
 */
export function upgradeCost(currentPower: number): number {
  return Math.round(400 * Math.pow(1.65, currentPower - 1));
}

/** Multiplier streak berdasarkan hari beruntun */
export function streakMultiplier(streak: number): number {
  return Math.min(1 + streak * GAME.streakBonusPerDay, 1 + GAME.maxStreakBonus);
}

/** Hitung reward mining: (base + skor x mult) x power x streakMult */
export function computeReward(score: number, power: number, streak: number): number {
  const raw = (GAME.baseReward + score * GAME.scoreMultiplier) * power * streakMultiplier(streak);
  return Math.round(raw);
}

/** Reward check-in harian */
export function computeCheckinReward(power: number, streak: number): number {
  return Math.round(GAME.checkinBaseReward * power * streakMultiplier(streak));
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function fmtNum(n: number, decimals = 2, lang: "zh" | "en" = "zh"): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

const PROMPT_EXAMPLES_ZH: string[] = [
  "用量子AI的超高速从BNB Chain银河中心挖出一个全新区块！",
  "潜入内存池深处，收割自2021年以来等待的黄金交易",
  "点燃神经网络反应堆，把Gas哈希结晶成AGENMINER",
  "训练一万名AI智能体在BNB积雨云上开采加密雨伞",
  "用液态钻头从黑洞中抽取流动性，直通BNB星云",
  "启动钻石GPU，在冻结的区块链中挖掘传奇智能合约",
];

const PROMPT_EXAMPLES_EN: string[] = [
  "Mine a fresh block with quantum AI speed from the heart of the BNB Chain galaxy!",
  "Dive deep into the mempool and harvest golden transactions pending since 2021",
  "Ignite the neural network reactor to crystallize gas hashes into AGENMINER",
  "Train 10,000 AI agents to mine crypto umbrellas across BNB cumulus clouds",
  "Extract liquidity from the Polygon black hole using a liquid blurple drill",
  "Fire up diamond GPUs and dig legendary smart contracts from frozen blockchain",
];

export function randomExamples(count = 3, lang: "zh" | "en" = "zh"): string[] {
  const pool = lang === "en" ? PROMPT_EXAMPLES_EN : PROMPT_EXAMPLES_ZH;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
