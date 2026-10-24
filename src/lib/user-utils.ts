// ============================================
// AGENTIC MINER — Server helpers untuk user
// ============================================

import { GAME, todayStr, yesterdayStr } from "./game-config";
import type { User } from "@prisma/client";
import type { PublicUser } from "./types";

export function toPublicUser(u: User): PublicUser {
  const now = Date.now();
  const canCheckin = u.lastCheckin !== todayStr();
  const nextMineAt = u.lastMineAt ? u.lastMineAt.getTime() + GAME.cooldownMs : null;
  return {
    walletAddress: u.walletAddress,
    username: u.username ?? `Miner${u.refCode.slice(0, 4)}`,
    avatar: u.avatar,
    balance: u.balance,
    totalMined: u.totalMined,
    miningPower: u.miningPower,
    streak: u.streak,
    refCode: u.refCode,
    refEarnings: u.refEarnings,
    canCheckin,
    nextMineAt: nextMineAt && nextMineAt > now ? nextMineAt : null,
  };
}

export function generateRefCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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
