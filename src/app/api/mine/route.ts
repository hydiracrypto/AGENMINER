// POST /api/mine — Tambang AGENMINER via prompt AI (inti game)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GAME, TOKEN, computeReward, isValidEvmAddress, todayStr } from "@/lib/game-config";
import { evaluateMiningPrompt } from "@/lib/ai-engine";
import { nextStreak, toPublicUser } from "@/lib/user-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body?.address ?? "").trim().toLowerCase();
    const prompt = String(body?.prompt ?? "").trim();

    if (!isValidEvmAddress(address)) {
      return NextResponse.json({ error: "Alamat wallet tidak valid" }, { status: 400 });
    }
    if (prompt.length < GAME.minPromptLen) {
      return NextResponse.json(
        { error: `Prompt terlalu pendek. Minimal ${GAME.minPromptLen} karakter.` },
        { status: 400 }
      );
    }
    if (prompt.length > GAME.maxPromptLen) {
      return NextResponse.json(
        { error: `Prompt terlalu panjang. Maksimal ${GAME.maxPromptLen} karakter.` },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { walletAddress: address } });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan, silakan login ulang" }, { status: 404 });
    }

    // ── Cek cooldown ──
    const now = Date.now();
    if (user.lastMineAt) {
      const readyAt = user.lastMineAt.getTime() + GAME.cooldownMs;
      if (now < readyAt) {
        return NextResponse.json(
          { error: "Rig masih mendinginkan. Tunggu sebentar!", remainingMs: readyAt - now },
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
        { error: "Prompt ini sudah kamu pakai baru-baru ini. Coba ide baru yang lebih kreatif!" },
        { status: 400 }
      );
    }

    // ── Cek pool mining global ──
    const agg = await db.user.aggregate({ _sum: { totalMined: true } });
    const globalMined = agg._sum.totalMined ?? 0;
    if (globalMined >= TOKEN.miningPool) {
      return NextResponse.json(
        { error: "Pool mining sudah habis! Terima kasih sudah menjadi bagian dari AGENTIC MINER." },
        { status: 409 }
      );
    }

    // ── Evaluasi prompt via AI ──
    const verdict = await evaluateMiningPrompt(prompt);

    // ── Update streak harian ──
    const newStreak = nextStreak(user);

    // ── Hitung reward ──
    let reward = computeReward(verdict.score, user.miningPower, newStreak);
    // Jangan biarkan reward melebihi sisa pool
    const poolRemaining = TOKEN.miningPool - globalMined;
    if (reward > poolRemaining) reward = Math.max(0, Math.floor(poolRemaining));

    // ── Komisi referral 5% ke pengundang ──
    const refCommission = user.referredById ? Math.round(reward * GAME.refCommission * 100) / 100 : 0;

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
      user: toPublicUser(updated!),
      logId: mineLog.id,
    });
  } catch (err) {
    console.error("[mine]", err);
    return NextResponse.json({ error: "Rig mengalami gangguan. Coba lagi." }, { status: 500 });
  }
}
