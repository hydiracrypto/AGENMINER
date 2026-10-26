// ============================================
// AGENTIC MINER — Server helpers untuk user
// ============================================

import { effectiveCooldownMs, remainingCap, todayStr, yesterdayStr } from "./game-config";
import type { User } from "@prisma/client";
import type { PublicUser } from "./types";

export function toPublicUser(u: User): PublicUser {
  const now = Date.now();
  const canCheckin = u.lastCheckin !== todayStr();
  const cooldownMs = effectiveCooldownMs(u.verifiedAgent);
  const nextMineAt = u.lastMineAt ? u.lastMineAt.getTime() + cooldownMs : null;
  return {
    walletAddress: u.walletAddress,
    agentId: u.agentId,
    verifiedAgent: u.verifiedAgent,
    username: u.username ?? u.agentId ?? `Miner${u.refCode.slice(0, 4)}`,
    avatar: u.avatar,
    balance: u.balance,
    totalMined: u.totalMined,
    miningPower: u.miningPower,
    streak: u.streak,
    refCode: u.refCode,
    refEarnings: u.refEarnings,
    canCheckin,
    nextMineAt: nextMineAt && nextMineAt > now ? nextMineAt : null,
    cooldownMs,
    capRemaining: remainingCap(u.totalMined),
  };
}

export function generateRefCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---------- Binance Agent ID (username & invite code) ----------

const AGENT_ADJ = [
  "Swift", "Lucky", "Nova", "Iron", "Gold", "Turbo", "Astro", "Cyber", "Mega", "Ultra",
  "Bright", "Prime", "Quantum", "Stellar", "Rocket", "Thunder", "Diamond", "Solar", "Lunar", "Neo",
  "Alpha", "Delta", "Omega", "Titan", "Vortex", "Pixel", "Crypto", "Meta", "Hyper", "Zen",
];

const AGENT_NOUN = [
  "Miner", "Agent", "Falcon", "Tiger", "Wolf", "Eagle", "Dragon", "Panda", "Lion", "Shark",
  "Rocket", "Comet", "Pulse", "Forge", "Vault", "Ranger", "Hunter", "Pilot", "Rider", "Scout",
  "Byte", "Block", "Chain", "Token", "Hash", "Node", "Core", "Peak", "Wave", "Storm",
];

/** Agent ID mudah dibaca, mis. "SwiftFalcon42" — jadi username & invite code */
export function generateAgentId(): string {
  const adj = AGENT_ADJ[Math.floor(Math.random() * AGENT_ADJ.length)];
  const noun = AGENT_NOUN[Math.floor(Math.random() * AGENT_NOUN.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${adj}${noun}${num}`;
}

/** Pairing code 6 karakter hex lowercase, mis. "78f869" (ala Binance pairing) */
export function generatePairingCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += Math.floor(Math.random() * 16).toString(16);
  return c;
}

/**
 * Update streak harian berdasarkan tanggal aktivitas.
 * Return streak baru.
 */
export function nextStreak(u: Pick<User, "lastActiveDate" | "streak">): number {
  const today = todayStr();
  if (u.lastActiveDate === today) return u.streak > 0 ? u.streak : 1;
  if (u.lastActiveDate === yesterdayStr()) return u.streak + 1;
  return 1;
}
