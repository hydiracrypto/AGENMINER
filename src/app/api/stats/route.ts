// GET /api/stats — Statistik global token & mining
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TOKEN } from "@/lib/game-config";
import type { GlobalStats } from "@/lib/types";

export async function GET() {
  try {
    const [minedAgg, minerCount, mineCount] = await Promise.all([
      db.user.aggregate({ _sum: { totalMined: true } }),
      db.user.count(),
      db.mineLog.count(),
    ]);

    const totalMined = minedAgg._sum.totalMined ?? 0;
    const stats: GlobalStats = {
      totalSupply: TOKEN.totalSupply,
      miningPool: TOKEN.miningPool,
      totalMined: Math.round(totalMined * 100) / 100,
      poolRemaining: Math.max(0, TOKEN.miningPool - Math.round(totalMined * 100) / 100),
      totalMiners: minerCount,
      totalMines: mineCount,
      chainName: TOKEN.chainName,
      tokenName: TOKEN.name,
      tokenSymbol: TOKEN.symbol,
      contractAddress: TOKEN.contractAddress,
    };
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[stats]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
