// GET /api/stats — Statistik global token, mining & likuiditas PancakeSwap
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TOKEN, WITHDRAW, PANCAKESWAP, effectivePoolRemaining } from "@/lib/game-config";
import type { GlobalStats } from "@/lib/types";

export async function GET(req: NextRequest) {
  // Trace perangkat mobile (HP user) — hanya UA mobile yang dicatat agar log tidak banjir
  const ua = req.headers.get("user-agent") ?? "";
  if (/Android|iPhone|iPad|Mobile/i.test(ua)) {
    console.log(`[stats] ${new Date().toISOString()} MOBILE-UA="${ua.slice(0, 90)}"`);
  }
  try {
    const [minedAgg, minerCount, mineCount, liqAgg, upAgg] = await Promise.all([
      db.user.aggregate({ _sum: { totalMined: true } }),
      db.user.count(),
      db.mineLog.count(),
      db.liquidityLog.aggregate({ _sum: { amount: true } }),
      db.upgradeLog.aggregate({ _sum: { cost: true } }),
    ]);

    const totalMined = Math.round((minedAgg._sum.totalMined ?? 0) * 100) / 100;
    const poolRecycled = Math.round((upAgg._sum.cost ?? 0) * 100) / 100;
    const stats: GlobalStats = {
      totalSupply: TOKEN.totalSupply,
      miningPool: TOKEN.miningPool,
      totalMined,
      // Sisa pool EFEKTIF: bakaran upgrade Mining Power didaur ulang ke pool 70M
      poolRemaining: Math.round(effectivePoolRemaining(totalMined, poolRecycled) * 100) / 100,
      poolRecycled,
      totalMiners: minerCount,
      totalMines: mineCount,
      chainName: TOKEN.chainName,
      tokenName: TOKEN.name,
      tokenSymbol: TOKEN.symbol,
      contractAddress: TOKEN.contractAddress,
      totalLiquidityAdded: Math.round((liqAgg._sum.amount ?? 0) * 100) / 100,
      withdrawFeePct: WITHDRAW.feePct,
      withdrawDex: PANCAKESWAP.dex,
    };
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[stats]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
