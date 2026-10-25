// GET /api/agentic/poll?qrCodeId=... — polling status sign-in Agentic Wallet
// WAITING → masih menunggu konfirmasi di Binance App
// SUCCESS → user terverifikasi (gate NFT Agentic ID lolos) + akun game siap
// NFT_REQUIRED → wallet bukan holder NFT Agentic ID → ditolak masuk
// EXPIRED → kode kedaluwarsa / digantikan sign-in baru
import { NextRequest, NextResponse } from "next/server";
import { pollAgenticSignIn } from "@/lib/agentic-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const qrCodeId = req.nextUrl.searchParams.get("qrCodeId") ?? "";
    if (!qrCodeId) return NextResponse.json({ status: "EXPIRED" });
    const r = await pollAgenticSignIn(qrCodeId);
    return NextResponse.json(r);
  } catch (err) {
    console.error("[agentic/poll]", err);
    return NextResponse.json({ status: "EXPIRED" });
  }
}
