// POST /api/auth/login — Masuk / daftar penambang via wallet address
// Terbuka untuk semua wallet (tanpa gate NFT / whitelist).
// GET bridge: proxy/jaringan yang memblokir POST tetap bisa masuk via ?address=&refCode=
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidEvmAddress } from "@/lib/game-config";
import { registerUser } from "@/lib/create-user";
import { toPublicUser } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const refCode = String(body?.refCode ?? "").trim().toUpperCase();

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // User lama → langsung masuk
    const existing = await db.user.findUnique({ where: { walletAddress: address } });
    if (existing) {
      return NextResponse.json({ user: toPublicUser(existing), isNew: false });
    }

    // User baru (Agent ID + invite code + referral) via helper bersama
    const user = await registerUser(address, refCode);
    return NextResponse.json({ user: toPublicUser(user), isNew: true });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET bridge — body dibaca dari query params, diteruskan ke POST */
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
