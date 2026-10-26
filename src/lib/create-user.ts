// ============================================
// AGENTIC MINER — Registrasi miner baru (dipakai auth/login & pair/approve)
// ============================================

import { db } from "@/lib/db";
import { GAME } from "@/lib/game-config";
import { generateAgentId } from "@/lib/user-utils";
import type { User } from "@prisma/client";

/**
 * Buat user baru dengan Agent ID unik.
 * - agentId → ditampilkan sebagai username
 * - refCode  = agentId uppercase → dipakai sebagai invite code
 * - referral: beri bonus join ke pengundang bila refCode valid
 * Idempotent: bila address sudah terdaftar, kembalikan user yang ada.
 */
export async function registerUser(address: string, refCode?: string | null): Promise<User> {
  const addr = address.trim().toLowerCase();
  const ref = (refCode ?? "").trim().toUpperCase();

  // Sudah terdaftar → langsung pakai
  const existing = await db.user.findUnique({ where: { walletAddress: addr } });
  if (existing) return existing;

  let created: User | null = null;
  for (let attempt = 0; attempt < 8 && !created; attempt++) {
    const agentId = generateAgentId();
    try {
      created = await db.user.create({
        data: {
          walletAddress: addr,
          agentId,
          refCode: agentId.toUpperCase(),
        },
      });
    } catch {
      created = null; // agentId/refCode bentrok → coba kombinasi lain
    }
  }
  if (!created) throw new Error("Failed to create account");

  // Proses referral: bonus langsung ke pengundang
  if (ref) {
    const referrer = await db.user.findUnique({ where: { refCode: ref } });
    if (referrer && referrer.id !== created.id) {
      await db.$transaction([
        db.user.update({
          where: { id: created.id },
          data: { referredById: referrer.id },
        }),
        db.user.update({
          where: { id: referrer.id },
          data: {
            balance: { increment: GAME.referrerJoinBonus },
            refEarnings: { increment: GAME.referrerJoinBonus },
          },
        }),
      ]);
    }
  }

  const fresh = await db.user.findUnique({ where: { walletAddress: addr } });
  if (!fresh) throw new Error("Failed to load account");
  return fresh;
}
