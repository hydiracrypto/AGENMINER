// POST /api/withdraw — Ajukan penarikan AGENMINER ke wallet
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME, TOKEN, isValidEvmAddress } from "@/lib/game-config";
import { toPublicUser } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const amount = Number(body?.amount);

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Alamat wallet tidak valid" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (amount < GAME.minWithdraw) {
      return NextResponse.json(
        { error: `Minimal penarikan ${GAME.minWithdraw.toLocaleString("id-ID")} ${TOKEN.symbol}` },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }
    if (user.balance < amount) {
      return NextResponse.json({ error: "Saldo tidak cukup" }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });
      const w = await tx.withdrawal.create({
        data: { userId: user.id, amount, status: "PENDING" },
      });
      return { u, w };
    });

    return NextResponse.json({
      user: toPublicUser(updated.u),
      withdrawal: {
        id: updated.w.id,
        amount: updated.w.amount,
        status: updated.w.status,
        txHash: updated.w.txHash,
        createdAt: updated.w.createdAt,
      },
      message: `Permintaan penarikan ${amount.toLocaleString("id-ID")} ${TOKEN.symbol} dikirim. Akan diproses ke wallet BNB Chain kamu.`,
    });
  } catch (err) {
    console.error("[withdraw]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
