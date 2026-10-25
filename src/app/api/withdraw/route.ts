// POST /api/withdraw — Tarik AGENMINER ke wallet BNB Chain (TANPA minimal)
// ── AUTO MINT ──
// Penarikan diproses otomatis: token langsung di-mint ke wallet user.
// Fee (WITHDRAW.feePct) otomatis masuk likuiditas DEX PancakeSwap (LiquidityLog).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TOKEN, WITHDRAW, PANCAKESWAP, isValidEvmAddress, splitWithdrawal } from "@/lib/game-config";
import { mintWithdrawalOnchain } from "@/lib/onchain-mint";
import { toPublicUser } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const amount = Number(body?.amount);

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address", errorKey: "invalid_address" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount", errorKey: "invalid_amount" }, { status: 400 });
    }
    // TANPA minimal penarikan — berapapun jumlahnya selama saldo mencukupi

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Account not found", errorKey: "account_missing" }, { status: 404 });
    }
    if (user.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance", errorKey: "insufficient" }, { status: 400 });
    }

    // ── Pecah: net ke wallet + fee ke likuiditas PancakeSwap ──
    const { net, fee } = splitWithdrawal(amount);

    // ── Auto-mint on-chain (onchain bila kontrak+key aktif, else simulated) ──
    const mint = await mintWithdrawalOnchain(user.walletAddress, net, fee);
    if (!mint.ok) {
      return NextResponse.json(
        { error: "Auto-mint failed, try again", errorKey: "mint_failed" },
        { status: 502 }
      );
    }

    const now = new Date();

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });
      const w = await tx.withdrawal.create({
        data: {
          userId: user.id,
          amount,
          fee,
          netAmount: net,
          status: "PROCESSED", // langsung MINTED — tidak antre manual
          txHash: mint.txHash,
          mintMode: mint.mode.toUpperCase(),
          processedAt: now,
        },
      });
      if (fee > 0) {
        await tx.liquidityLog.create({
          data: {
            withdrawalId: w.id,
            amount: fee,
            dex: PANCAKESWAP.dex,
            pairAddress: PANCAKESWAP.pair || null,
            note: `Withdrawal fee ${WITHDRAW.feePct}% → PancakeSwap liquidity`,
          },
        });
      }
      return { u, w };
    });

    return NextResponse.json({
      user: toPublicUser(updated.u),
      withdrawal: {
        id: updated.w.id,
        amount: updated.w.amount,
        fee: updated.w.fee,
        netAmount: updated.w.netAmount,
        status: updated.w.status,
        txHash: updated.w.txHash,
        mintMode: updated.w.mintMode,
        createdAt: updated.w.createdAt,
      },
      liquidity: { fee, dex: PANCAKESWAP.dex },
      mint: { mode: mint.mode, txHash: mint.txHash },
    });
  } catch (err) {
    console.error("[withdraw]", err);
    return NextResponse.json({ error: "Server error", errorKey: "server_error" }, { status: 500 });
  }
}

/** GET bridge — proxy/jaringan yang memblokir POST tetap bisa tarik via ?address=&amount= */
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
