// POST /api/mine — Tambang AGENMINER via prompt AI (inti game)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME, TOKEN, clampToCap, computeReward, effectiveCooldownMs, effectivePoolRemaining, isValidEvmAddress, remainingCap, todayStr } from "@/lib/game-config";
import { evaluateMiningPrompt } from "@/lib/ai-engine";
import { nextStreak, toPublicUser } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const prompt = String(body?.prompt ?? "").trim();
    const lang: "zh" | "en" = body?.lang === "en" ? "en" : "zh";

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address", errorKey: "invalid_address" }, { status: 400 });
    }
    if (prompt.length < GAME.minPromptLen) {
      return NextResponse.json(
        { error: `Prompt too short. Minimum ${GAME.minPromptLen} characters.`, errorKey: "prompt_short" },
        { status: 400 }
      );
    }
    if (prompt.length > GAME.maxPromptLen) {
      return NextResponse.json(
        { error: `Prompt too long. Maximum ${GAME.maxPromptLen} characters.`, errorKey: "prompt_long" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Account not found, please sign in again", errorKey: "account_missing" }, { status: 404 });
    }

    // ── Cap lifetime 7.000 AGENMINER per wallet (semua sumber reward) ──
    const capRemaining = remainingCap(user.totalMined);
    if (capRemaining <= 0) {
      return NextResponse.json(
        {
          error: `Wallet mining cap reached — max ${GAME.perWalletCap.toLocaleString("en-US")} ${TOKEN.symbol} per wallet. Thank you for mining!`,
          errorKey: "mining_cap",
          capRemaining: 0,
        },
        { status: 403 }
      );
    }

    // ── Cek cooldown (60 dtk dgn Agent ID Binance / 5 mnt tanpa Agent ID) ──
    const cooldownMs = effectiveCooldownMs(user.verifiedAgent);
    const now = Date.now();
    if (user.lastMineAt) {
      const readyAt = user.lastMineAt.getTime() + cooldownMs;
      if (now < readyAt) {
        return NextResponse.json(
          { error: "Rig is still cooling. Wait a moment!", errorKey: "cooldown", remainingMs: readyAt - now },
          { status: 429 }
        );
      }
    }

    // ── Cek duplikat prompt (anti-spam) ──
    const normalized = prompt.toLowerCase().replace(/\s+/g, " ");
    const recent = await db.mineLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: GAME.recentPromptLimit,
      select: { prompt: true },
    });
    if (recent.some((m) => m.prompt.toLowerCase().replace(/\s+/g, " ") === normalized)) {
      return NextResponse.json(
        { error: "You used this prompt recently. Try a fresher, more creative idea!", errorKey: "duplicate_prompt" },
        { status: 400 }
      );
    }

    // ── Cek pool mining global (token bakaran upgrade didaur ulang ke pool) ──
    const [agg, upAgg] = await Promise.all([
      db.user.aggregate({ _sum: { totalMined: true } }),
      db.upgradeLog.aggregate({ _sum: { cost: true } }),
    ]);
    const globalMined = agg._sum.totalMined ?? 0;
    const totalRecycled = upAgg._sum.cost ?? 0;
    const poolRemaining = effectivePoolRemaining(globalMined, totalRecycled);
    if (poolRemaining <= 0) {
      return NextResponse.json(
        { error: "Mining pool is depleted!", errorKey: "pool_empty" },
        { status: 409 }
      );
    }

    // ── Evaluasi prompt via AI (narasi mengikuti bahasa user) ──
    const verdict = await evaluateMiningPrompt(prompt, lang);

    // ── Update streak harian ──
    const newStreak = nextStreak(user);

    // ── Hitung reward (50% speed bila wallet tanpa Agent ID Binance) ──
    const speedMult = user.verifiedAgent ? 1 : GAME.noAgentIdRewardMult;
    let reward = Math.round(computeReward(verdict.score, user.miningPower, newStreak) * speedMult);
    // Jangan biarkan reward melebihi sisa pool (efektif, termasuk daur ulang) & sisa cap 7.000 wallet
    if (reward > poolRemaining) reward = Math.max(0, Math.floor(poolRemaining));
    reward = Math.min(reward, capRemaining);

    // ── Komisi referral 2% ke pengundang — ikut cap 7.000 & akuntansi pool ──
    let refCommission = 0;
    if (user.referredById) {
      const referrer = await db.user.findUnique({ where: { id: user.referredById } });
      if (referrer) {
        refCommission = clampToCap(referrer.totalMined, Math.round(reward * GAME.refCommission * 100) / 100);
      }
    }

    // ── Simpan ke database (transaksi) ──
    const mineLog = await db.$transaction(async (tx) => {
      const log = await tx.mineLog.create({
        data: {
          userId: user.id,
          prompt,
          score: verdict.score,
          reward,
          aiSummary: verdict.summary,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: reward },
          totalMined: { increment: reward },
          streak: newStreak,
          lastMineAt: new Date(),
          lastActiveDate: todayStr(),
        },
      });
      if (user.referredById && refCommission > 0) {
        await tx.user.update({
          where: { id: user.referredById },
          data: {
            balance: { increment: refCommission },
            refEarnings: { increment: refCommission },
            totalMined: { increment: refCommission }, // konsumsi pool 70M (dulu bocor di luar pool!)
          },
        });
      }
      return log;
    });

    const updated = await db.user.findUnique({ where: { id: user.id } });

    return NextResponse.json({
      reward,
      score: verdict.score,
      summary: verdict.summary,
      response: verdict.response,
      refCommission,
      capRemaining: remainingCap(updated!.totalMined),
      verifiedAgent: user.verifiedAgent,
      user: toPublicUser(updated!),
      logId: mineLog.id,
    });
  } catch (err) {
    console.error("[mine]", err);
    return NextResponse.json({ error: "Mining rig glitch. Try again." }, { status: 500 });
  }
}

/** GET bridge — proxy/jaringan yang memblokir POST tetap bisa menambang via ?address=&prompt=&lang= */
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
