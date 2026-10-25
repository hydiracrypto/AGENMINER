// POST /api/pair/approve — setujui sesi pairing dari halaman /pair/[code]
// Membuat akun miner (Agent ID) + menandai sesi APPROVED, lalu modal di
// perangkat pertama otomatis login via polling /api/pair/status.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerUser } from "@/lib/create-user";
import { toPublicUser } from "@/lib/user-utils";

const CODE_RE = /^[0-9a-f]{6}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code ?? "").trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: "Invalid pairing code" }, { status: 400 });
    }

    const session = await db.pairSession.findUnique({ where: { code } });
    if (!session) {
      return NextResponse.json({ error: "Pairing session not found" }, { status: 404 });
    }
    if (session.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Pairing code expired" }, { status: 410 });
    }

    // Sudah di-approve → idempotent, kembalikan user yang sama
    if (session.status === "APPROVED" && session.address) {
      const user = await db.user.findUnique({ where: { walletAddress: session.address } });
      if (user) {
        return NextResponse.json({ ok: true, user: toPublicUser(user) });
      }
    }

    // Demo wallet: alamat EVM acak (integrasi wallet nyata memakai alamat Binance)
    const hex = "0123456789abcdef";
    let address = "0x";
    for (let i = 0; i < 40; i++) address += hex[Math.floor(Math.random() * 16)];

    const user = await registerUser(address, session.refCode);

    await db.pairSession.update({
      where: { code },
      data: { status: "APPROVED", address: user.walletAddress },
    });

    return NextResponse.json({ ok: true, user: toPublicUser(user) });
  } catch (err) {
    console.error("[pair/approve]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
