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

export const GAME = {
  cooldownMs: 60_000, // jeda antar mining: 60 detik
  minPromptLen: 15,
  maxPromptLen: 500,
  baseReward: 25, // reward dasar per mining
  scoreMultiplier: 0.6, // bonus = skor AI (0-100) x 0.6
  streakBonusPerDay: 0.05, // +5% per hari streak
  maxStreakBonus: 0.5, // maksimal +50%
  referrerJoinBonus: 500, // bonus undangan untuk pengundang
  refCommission: 0.05, // komisi 5% dari reward pengundang
  checkinBaseReward: 100, // reward check-in harian dasar
  minWithdraw: 2_500, // minimal penarikan
  recentPromptLimit: 10, // cek duplikat 10 prompt terakhir
} as const;

/** Biaya upgrade mining power ke level berikutnya */
export function upgradeCost(currentPower: number): number {
  return Math.round(750 * Math.pow(currentPower, 1.6));
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

export function fmtNum(n: number, decimals = 2): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

export const PROMPT_EXAMPLES: string[] = [
  "Tambang blok baru dengan cepat quantum AI dari pusat galaksi BNB Chain!",
  "Selami kedalaman mempool dan panen transaksi emas yang tertunda sejak 2021",
  "Hidupkan reaktor neural network untuk mengkristalkan hash gas menjadi AGENMINER",
  "Latih 10.000 agent AI untuk menambang payung crypto di awan kumulus BNB",
  "Ekstrak likuiditas dari lubang hitam Polygon dengan pengebor blurple cair",
  "Nyalakan GPU berlian dan gali smart contract legendaris di blockchain beku",
];

export function randomExamples(count = 3): string[] {
  const shuffled = [...PROMPT_EXAMPLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
