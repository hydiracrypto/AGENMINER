// ============================================
// AGENTIC MINER — Registrasi miner baru (dipakai auth/login & pair/approve)
// ============================================

import { db } from "@/lib/db";
import { GAME } from "@/lib/game-config";
import { generateAgentId } from "@/lib/user-utils";
import type { User } from "@prisma/client";

/**
 * Buat user baru dengan Agent ID unik.
 * - realAgentId (opsional) → Binance Agent ID ASLI milik akun (mis. "everhand.ai",
 *   dari `baw wallet agent-id`). Username pemilik wallet mengikuti ID Agen aslinya,
 *   bukan nama acak. Untuk user lama: username disinkronkan bila berubah.
 * - agentId → ditampilkan sebagai username
 * - refCode  = agentId uppercase → dipakai sebagai invite code
 * - referral: beri bonus join ke pengundang bila refCode valid
 * Idempotent: bila address sudah terdaftar, kembalikan user yang ada.
 */
export async function registerUser(
  address: string,
  refCode?: string | null,
  realAgentId?: string | null
): Promise<User> {
  const addr = address.trim().toLowerCase();
  const agentName = (realAgentId ?? "").trim().toLowerCase() || null;
  const ref = (refCode ?? "").trim().toUpperCase();

  // Sudah terdaftar → sinkronkan username dgn Binance Agent ID asli (bila ada & berubah)
  const existing = await db.user.findUnique({ where: { walletAddress: addr } });
  if (existing) {
    if (agentName && agentName !== existing.username) {
      try {
        return await db.user.update({
          where: { id: existing.id },
          data: { username: agentName, agentId: agentName },
        });
      } catch {
        // agentId @unique bentrok (dipakai wallet lain) → update username saja
        try {
          return await db.user.update({
            where: { id: existing.id },
            data: { username: agentName },
          });
        } catch {
          return existing;
        }
      }
    }
    return existing;
  }

  let created: User | null = null;
  for (let attempt = 0; attempt < 8 && !created; attempt++) {
    // Percobaan pertama pakai Agent ID asli Binance (bila tersedia), selanjutnya acak
    const agentId = attempt === 0 && agentName ? agentName : generateAgentId();
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
