// POST /api/auth/login — Masuk / daftar penambang via wallet address
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME, isValidEvmAddress } from "@/lib/game-config";
import { generateAgentId, toPublicUser } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const refCode = String(body?.refCode ?? "").trim().toUpperCase();

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // Cari user existing
    let user = await db.user.findUnique({ where: { walletAddress: address } });
    if (user) {
      return NextResponse.json({ user: toPublicUser(user), isNew: false });
    }

    // Buat user baru — Agent ID unik dipakai sebagai username & invite code (refCode)
    let created = null;
    for (let attempt = 0; attempt < 8 && !created; attempt++) {
      const agentId = generateAgentId();
      try {
        created = await db.user.create({
          data: {
            walletAddress: address,
            agentId,
            refCode: agentId.toUpperCase(),
          },
        });
      } catch {
        created = null; // agentId/refCode bentrok → coba lagi
      }
    }
    if (!created) {
      return NextResponse.json({ error: "Failed to create account, try again" }, { status: 500 });
    }

    // Proses referral: beri bonus ke pengundang
    if (refCode) {
      const referrer = await db.user.findUnique({ where: { refCode } });
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

    user = await db.user.findUnique({ where: { walletAddress: address } });
    return NextResponse.json({ user: toPublicUser(user!), isNew: true });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
