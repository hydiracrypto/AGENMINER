// POST /api/auth/login — Masuk / daftar penambang via wallet address
// GATE: hanya wallet pemegang NFT "Agent ID" (SPACE ID) di BNB Chain mainnet
// yang boleh masuk. Tanpa NFT → 403 agent_id_required.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidEvmAddress } from "@/lib/game-config";
import { checkAgentId } from "@/lib/agent-id";
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

    // ── GATE AGENTIC ID: wajib holder NFT Agent ID ──
    // (whitelist & cache ditangani di checkAgentId; RPC gagal → trusted=false → jangan kunci user)
    const gate = await checkAgentId(address);
    if (gate.trusted && !gate.ok) {
      return NextResponse.json(
        {
          error: "This wallet does not hold the Agentic ID NFT (SPACE ID Agent ID on BNB Chain mainnet). Entry is denied.",
          errorKey: "agent_id_required",
          contract: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
        },
        { status: 403 }
      );
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
