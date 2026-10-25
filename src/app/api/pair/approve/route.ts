// POST /api/pair/approve — setujui sesi pairing dari halaman /pair/[code]
// Alamat wallet NYATA dikirim dari halaman pairing (connect di perangkat kedua).
// GATE: hanya holder NFT "Agent ID" (SPACE ID) yang boleh disetujui.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidEvmAddress } from "@/lib/game-config";
import { checkAgentId } from "@/lib/agent-id";
import { registerUser } from "@/lib/create-user";
import { toPublicUser } from "@/lib/user-utils";

const CODE_RE = /^[0-9a-f]{6}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code ?? "").trim().toLowerCase();
    const address = String(body?.address ?? "").trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: "Invalid pairing code" }, { status: 400 });
    }
    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Connect your wallet first" }, { status: 400 });
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

    // ── GATE AGENTIC ID: wajib holder NFT Agent ID ──
    const gate = await checkAgentId(address);
    if (gate.trusted && !gate.ok) {
      return NextResponse.json(
        {
          error: "This wallet does not hold the Agentic ID NFT (SPACE ID Agent ID on BNB Chain mainnet). Entry is denied.",
          errorKey: "agent_id_required",
        },
        { status: 403 }
      );
    }
    // Semua RPC gagal → tolak dengan pesan coba lagi (tidak ada cara memverifikasi)
    if (!gate.trusted) {
      return NextResponse.json(
        { error: "Could not verify Agentic ID right now — please try again.", errorKey: "agent_id_unverified" },
        { status: 503 }
      );
    }

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
