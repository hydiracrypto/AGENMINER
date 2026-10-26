// GET /api/leaderboard — Papan peringkat penambang teratas
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidEvmAddress, truncateAddress } from "@/lib/game-config";
import type { LeaderboardRow } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const meParam = searchParams.get("me")?.trim().toLowerCase() ?? "";
    const meId = isValidEvmAddress(meParam) ? meParam : "";

    const top = await db.user.findMany({
      orderBy: [{ totalMined: "desc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        walletAddress: true,
        username: true,
        agentId: true,
        avatar: true,
        totalMined: true,
        miningPower: true,
        refCode: true,
      },
    });

    let meRank = 0;
    if (meId) {
      const me = await db.user.findUnique({
        where: { walletAddress: meId },
        select: { totalMined: true },
      });
      if (me && me.totalMined > 0) {
        const higher = await db.user.count({
          where: { totalMined: { gt: me.totalMined } },
        });
        meRank = higher + 1;
      }
    }

    const rows: LeaderboardRow[] = top.map((u, i) => ({
      rank: i + 1,
      walletAddress: truncateAddress(u.walletAddress),
      username: u.username ?? u.agentId ?? `Miner${u.refCode.slice(0, 4)}`,
      avatar: u.avatar,
      totalMined: u.totalMined,
      miningPower: u.miningPower,
      isMe: u.walletAddress === meId,
    }));

    return NextResponse.json({ rows, meRank });
  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
