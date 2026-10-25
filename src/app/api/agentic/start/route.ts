// POST /api/agentic/start — mulai sign-in Binance Agentic Wallet (pola ptah.trade)
// Server menjalankan `baw auth signin` resmi → QR uni-qr + pairing code ASLI.
// Bila sesi server masih hidup (ALREADY_CONNECTED) → langsung login tanpa QR.
// Terbuka untuk semua wallet (tanpa gate NFT / whitelist).
import { NextRequest, NextResponse } from "next/server";
import { startAgenticSignIn } from "@/lib/agentic-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refCode = String(body?.refCode ?? "").trim().toUpperCase() || null;
    const r = await startAgenticSignIn(refCode);

    if (r.kind === "error") {
      return NextResponse.json({ error: r.message }, { status: 502 });
    }
    if (r.kind === "already") {
      return NextResponse.json({ alreadyConnected: true, user: r.user, address: r.address });
    }

    const s = r.session;
    return NextResponse.json({
      qrCodeId: s.qrCodeId,
      urlForWeb: s.urlForWeb,
      pairingCode: s.pairingCode,
      expireAt: s.expireAt,
      secondsLeft: Math.max(0, Math.floor((s.expireAt - Date.now()) / 1000)),
    });
  } catch (err) {
    console.error("[agentic/start]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
