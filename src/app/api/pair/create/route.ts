// POST /api/pair/create — daftarkan sesi pairing QR dari modal Agent Wallet
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CODE_RE = /^[0-9a-f]{6}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code ?? "").trim().toLowerCase();
    const refCode = String(body?.refCode ?? "").trim().toUpperCase() || null;

    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: "Invalid pairing code" }, { status: 400 });
    }

    // Bersihkan sesi kedaluwarsa (>1 jam) agar tabel rapi
    await db.pairSession.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
    });

    const expiresAt = new Date(Date.now() + 300 * 1000); // 5 menit
    await db.pairSession.upsert({
      where: { code },
      create: { code, refCode, expiresAt },
      update: { status: "WAITING", address: null, refCode, expiresAt },
    });

    return NextResponse.json({ ok: true, expiresIn: 300 });
  } catch (err) {
    console.error("[pair/create]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
