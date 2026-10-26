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

  // Sudah terdaftar → sinkronkan username + KODE INVITE dgn Binance Agent ID
  // asli (bila ada & berubah). Kode invite = Agent ID uppercase (mis.
  // "EVERHAND.AI") — sesuai permintaan: kode invite mengikuti ID Agen pemilik.
  const existing = await db.user.findUnique({ where: { walletAddress: addr } });
  if (existing) {
    const wantRef = agentName ? agentName.toUpperCase() : null;
    const needUsername = agentName && agentName !== existing.username;
    const needRef = wantRef && wantRef !== existing.refCode;
    if (needUsername || needRef) {
      const data: { username?: string; agentId?: string; refCode?: string } = {};
      if (needUsername) {
        data.username = agentName;
        data.agentId = agentName;
      }
      if (needRef) data.refCode = wantRef;
      try {
        return await db.user.update({ where: { id: existing.id }, data });
      } catch {
        // agentId/refCode @unique bentrok → coba sinkron parsial (username saja,
        // lalu refCode saja) agar perubahan yang mungkin tetap diterapkan
        try {
          if (needUsername) {
            return await db.user.update({
              where: { id: existing.id },
              data: { username: agentName, agentId: agentName },
            });
          }
        } catch {
          /* lanjut ke percobaan refCode */
        }
        try {
          if (needRef) {
            return await db.user.update({ where: { id: existing.id }, data: { refCode: wantRef } });
          }
        } catch {
          /* biarkan data lama */
        }
        return existing;
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
