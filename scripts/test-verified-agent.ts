// Verifikasi jalur verifiedAgent (Agent ID Binance asli): cooldown 60 dtk + reward PENUH
// lalu bersihkan semua data test. Jalankan: bun scripts/test-verified-agent.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const API = "http://localhost:3000";
const A = "0xa000000000000000000000000000000000000001";
const B = "0xb000000000000000000000000000000000000002";

async function post(path: string, body: any) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  await db.user.deleteMany({ where: { walletAddress: { in: [A, B] } } });
  const l1 = await post("/api/auth/login", { address: A });
  const refCode = l1.json?.user?.refCode;

  // Simulasikan pairing Binance Agentic Wallet: verifiedAgent = true
  await db.user.update({ where: { walletAddress: A }, data: { verifiedAgent: true } });

  const m1 = await post("/api/mine", { address: A, prompt: "quantum drill harvests golden hashes from the mempool nebula", lang: "en" });
  console.log(`${m1.status === 200 ? "✅" : "❌"} mine verified: reward=${m1.json?.reward} score=${m1.json?.score} verifiedAgent=${m1.json?.verifiedAgent}`);
  console.log(`${(m1.json?.reward ?? 0) > 50 ? "✅" : "❌"} reward PENUH (tanpa pangkas 50%): ${m1.json?.reward} > 50`);

  const m2 = await post("/api/mine", { address: A, prompt: "stellar excavator mines frozen smart contracts on bnb cumulus clouds", lang: "en" });
  console.log(`${m2.status === 429 ? "✅" : "❌"} cooldown verified: ${m2.status}, remainingMs=${m2.json?.remainingMs}`);
  console.log(`${(m2.json?.remainingMs ?? 0) <= 60_000 ? "✅" : "❌"} cooldown 60 dtk (bukan 5 menit): remainingMs=${m2.json?.remainingMs} ≤ 60000`);

  const u = await (await fetch(`${API}/api/user/${A}`)).json();
  console.log(`${u?.user?.cooldownMs === 60_000 ? "✅" : "❌"} PublicUser.cooldownMs=60000`);
  console.log(`${u?.user?.verifiedAgent === true ? "✅" : "❌"} PublicUser.verifiedAgent=true`);
  console.log(`${u?.user?.capRemaining === 7000 - m1.json?.reward ? "✅" : "❌"} capRemaining=${u?.user?.capRemaining} (7.000 - reward)`);

  // ── Cleanup total: kembalikan DB ke kondisi launch (0 user) ──
  const users = await db.user.findMany({ where: { walletAddress: { in: [A, B] } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  const rMine = await db.mineLog.deleteMany({ where: { userId: { in: ids } } });
  const rUsers = await db.user.deleteMany({ where: { walletAddress: { in: [A, B] } } });
  console.log(`🧹 Cleanup: ${rMine.count} MineLog, ${rUsers.count} User dihapus → DB kembali bersih (launch state)`);
  void refCode;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
