// POST /api/boost — Upgrade mining power & check-in harian
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME, TOKEN, clampToCap, computeCheckinReward, isValidEvmAddress, todayStr, upgradeCost } from "@/lib/game-config";
import { nextStreak, toPublicUser } from "@/lib/user-utils";

const TOKEN_SYMBOL = TOKEN.symbol;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const action = String(body?.action ?? "");

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address", errorKey: "invalid_address" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Account not found", errorKey: "account_missing" }, { status: 404 });
    }

    // ── UPGRADE: tingkatkan mining power dengan membakar AGENMINER ──
    if (action === "upgrade") {
      const cost = upgradeCost(user.miningPower);
      if (user.balance < cost) {
        return NextResponse.json(
          { error: `Insufficient balance. Need ${cost} ${TOKEN_SYMBOL} to upgrade.`, errorKey: "insufficient_upgrade" },
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
        message: `⚡ Mining Power up to Lv.${updated.miningPower}!`,
        spent: cost,
      });
    }

    // ── CHECK-IN harian ──
    if (action === "checkin") {
      const today = todayStr();
      if (user.lastCheckin === today) {
        return NextResponse.json({ error: "You already checked in today. Come back tomorrow!", errorKey: "already_checkin" }, { status: 400 });
      }
      const newStreak = nextStreak(user);
      // Check-in ikut cap lifetime 7.000 per wallet & akuntansi pool 70M
      const reward = clampToCap(user.totalMined, computeCheckinReward(user.miningPower, newStreak));
      const updated = await db.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: reward },
            totalMined: { increment: reward },
            streak: newStreak,
            lastCheckin: today,
            lastActiveDate: today,
          },
        });
        return u;
      });
      const capNote = user.totalMined >= GAME.perWalletCap ? " (cap 7,000 reached — no more rewards)" : "";
      return NextResponse.json({
        user: toPublicUser(updated),
        message: `🎁 Check-in day ${newStreak}: +${reward} ${TOKEN_SYMBOL}!${capNote}`,
        reward,
        streak: newStreak,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[boost]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


/** GET bridge — proxy/jaringan yang memblokir POST tetap bisa boost via ?address=&action= */
export async function GET(req: NextRequest) {
  const body: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    body[k] = v;
  });
  return POST(
    new NextRequest(new URL(req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}
