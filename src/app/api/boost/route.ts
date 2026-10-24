// POST /api/boost — Upgrade mining power & check-in harian
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME, TOKEN, computeCheckinReward, isValidEvmAddress, todayStr, upgradeCost } from "@/lib/game-config";
import { nextStreak, toPublicUser } from "@/lib/user-utils";

const TOKEN_SYMBOL = TOKEN.symbol;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const action = String(body?.action ?? "");

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Alamat wallet tidak valid" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }

    // ── UPGRADE: tingkatkan mining power dengan membakar AGENMINER ──
    if (action === "upgrade") {
      const cost = upgradeCost(user.miningPower);
      if (user.balance < cost) {
        return NextResponse.json(
          { error: `Saldo kurang. Butuh ${cost.toLocaleString("id-ID")} ${TOKEN_SYMBOL} untuk upgrade.` },
          { status: 400 }
        );
      }
      const updated = await db.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: cost }, miningPower: { increment: 1 } },
        });
        return u;
      });
      return NextResponse.json({
        user: toPublicUser(updated),
        message: `⚡ Mining Power naik ke Lv.${updated.miningPower}!`,
        spent: cost,
      });
    }

    // ── CHECK-IN harian ──
    if (action === "checkin") {
      const today = todayStr();
      if (user.lastCheckin === today) {
        return NextResponse.json({ error: "Kamu sudah check-in hari ini. Kembali besok!" }, { status: 400 });
      }
      const newStreak = nextStreak(user);
      const reward = computeCheckinReward(user.miningPower, newStreak);
      const updated = await db.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: reward },
            streak: newStreak,
            lastCheckin: today,
            lastActiveDate: today,
          },
        });
        return u;
      });
      return NextResponse.json({
        user: toPublicUser(updated),
        message: `🎁 Check-in hari ${newStreak}: +${reward.toLocaleString("id-ID")} ${TOKEN_SYMBOL}!`,
        reward,
        streak: newStreak,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err) {
    console.error("[boost]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

