// GET /api/agent-id?address=0x... — cek holder NFT Agentic ID (SPACE ID Agent ID)
// Dipakai client untuk pre-check cepat sebelum menampilkan tombol masuk.
import { NextRequest, NextResponse } from "next/server";
import { checkAgentId } from "@/lib/agent-id";
import { AGENTIC_ID, isValidEvmAddress } from "@/lib/game-config";

export async function GET(req: NextRequest) {
  try {
    const address = String(req.nextUrl.searchParams.get("address") ?? "").trim().toLowerCase();
    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const r = await checkAgentId(address);

    // Jika semua RPC gagal (infrastruktur), jangan blokir — anggap perlu verifikasi ulang saat login
    return NextResponse.json({
      ok: true,
      hasNft: r.hasNft || r.whitelisted,
      balance: r.balance,
      whitelisted: r.whitelisted,
      trusted: r.trusted,
      contract: AGENTIC_ID.contract,
      collection: AGENTIC_ID.name,
    });
  } catch (err) {
    console.error("[agent-id]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
