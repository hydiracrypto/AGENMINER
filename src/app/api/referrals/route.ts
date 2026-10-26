// GET /api/referrals?address=0x...&page=1&limit=20
// Daftar miner yang bergabung lewat link/kode referral pemilik address.
// Dipaginasi 20/halaman (maks 50) — UI pakai tombol Previous/Next.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidEvmAddress, truncateAddress } from "@/lib/game-config";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const address = sp.get("address")?.trim().toLowerCase() ?? "";
    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { walletAddress: address },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limitRaw = Number(sp.get("limit") ?? 20);
    const limit =
      Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 20;

    const total = await db.user.count({ where: { referredById: user.id } });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const pageRaw = Number(sp.get("page") ?? 1);
    const page =
      Number.isFinite(pageRaw) ? Math.min(totalPages, Math.max(1, Math.floor(pageRaw))) : 1;

    const rows = await db.user.findMany({
      where: { referredById: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        username: true,
        agentId: true,
        walletAddress: true,
        avatar: true,
        totalMined: true,
        verifiedAgent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      items: rows.map((u) => ({
        username: u.username ?? u.agentId ?? "Miner",
        agentId: u.agentId ?? "",
        walletAddress: truncateAddress(u.walletAddress),
        avatar: u.avatar,
        totalMined: u.totalMined,
        verifiedAgent: u.verifiedAgent,
        joinedAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error("[referrals]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
