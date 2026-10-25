// POST /api/agentic/signout — hapus sesi Agentic Wallet di server
// Setelah ini, login berikutnya WAJIB scan/sign ulang di Binance App
// (perilaku yang diminta: "ketika sign kemudian logout harus sign ulang").
// GET bridge: sama dengan POST, utk jaringan yang memblokir POST.
import { NextRequest, NextResponse } from "next/server";
import { agenticSignOut } from "@/lib/agentic-wallet";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ok = await agenticSignOut();
    return NextResponse.json({ ok });
  } catch (err) {
    console.error("[agentic/signout]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
