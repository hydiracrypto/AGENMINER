// GET /api/agentic/poll?qrCodeId=... — polling status sign-in Agentic Wallet
// WAITING → masih menunggu konfirmasi di Binance App
// SUCCESS → user terverifikasi + akun game siap (tanpa gate NFT)
// EXPIRED → kode kedaluwarsa / digantikan sign-in baru
import { NextRequest, NextResponse } from "next/server";
import { pollAgenticSignIn } from "@/lib/agentic-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  Vary: "*",
};

export async function GET(req: NextRequest) {
  try {
    const qrCodeId = req.nextUrl.searchParams.get("qrCodeId") ?? "";
    if (!qrCodeId) return NextResponse.json({ status: "EXPIRED" }, { headers: NO_STORE });
    const r = await pollAgenticSignIn(qrCodeId);
    return NextResponse.json(r, { headers: NO_STORE });
  } catch (err) {
    console.error("[agentic/poll]", err);
    return NextResponse.json({ status: "EXPIRED" }, { headers: NO_STORE });
  }
}
