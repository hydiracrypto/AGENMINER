// ============================================
// AGENTIC MINER — Shared Types (API ⇄ Client)
// ============================================

export interface PublicUser {
  walletAddress: string;
  agentId: string | null; // Binance Agent ID = username & invite code
  verifiedAgent: boolean; // true = Agent ID ASLI Binance (mining kecepatan penuh)
  username: string;
  avatar: string;
  balance: number;
  totalMined: number;
  miningPower: number;
  streak: number;
  refCode: string;
  refEarnings: number;
  canCheckin: boolean;
  nextMineAt: number | null; // epoch ms, null = bisa mining
  cooldownMs: number; // cooldown efektif wallet ini (60s / 300s)
  capRemaining: number; // sisa jatah lifetime terhadap cap 7.000
}

export interface MineResult {
  reward: number;
  score: number;
  summary: string;
  response: string;
  user: PublicUser;
}

export interface RecentMine {
  id: string;
  prompt: string;
  score: number;
  reward: number;
  aiSummary: string | null;
  createdAt: string;
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  txHash: string | null;
  mintMode?: string;
  createdAt: string;
  processedAt?: string | null;
}

export interface LeaderboardRow {
  rank: number;
  walletAddress: string;
  username: string;
  avatar: string;
  totalMined: number;
  miningPower: number;
  isMe: boolean;
}

export interface GlobalStats {
  totalSupply: number;
  miningPool: number;
  totalMined: number;
  poolRemaining: number; // sisa pool EFEKTIF = 70M − ditambang + daur ulang upgrade
  poolRecycled: number; // total token bakaran upgrade yang kembali ke pool 70M
  totalMiners: number;
  totalMines: number;
  chainName: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  // Likuiditas PancakeSwap dari fee penarikan
  totalLiquidityAdded: number;
  withdrawFeePct: number;
  withdrawDex: string;
}
