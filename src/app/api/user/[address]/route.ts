// GET /api/user/[address] — Profil penambang + riwayat
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidEvmAddress } from "@/lib/game-config";
import { toPublicUser } from "@/lib/user-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: rawAddr } = await params;
    const address = rawAddr.trim().toLowerCase();
    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Miner not found" }, { status: 404 });
    }

    const [recentMines, withdrawals] = await Promise.all([
      db.mineLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.withdrawal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({ user: toPublicUser(user), recentMines, withdrawals });
  } catch (err) {
    console.error("[user/[address]]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
