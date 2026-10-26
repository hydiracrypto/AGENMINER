/**
 * test-referrals.mjs — Seed 2 user: 1 referrer + 22 referred (uji paginasi 20/hal)
 * lalu panggil /api/referrals via dev server. Bersihkan data setelahnya.
 * Jalankan: bun scripts/test-referrals.mjs
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const A = "0xaaaa00000000000000000000000000000000aaaa";
const rnd = (i) => `0xbbbb${String(i).padStart(4, "0")}0000000000000000000000000000bbbb${i}`;

async function main() {
  // bersihkan sisa test lama
  await db.user.deleteMany({ where: { walletAddress: { in: [A, ...Array.from({ length: 22 }, (_, i) => rnd(i + 1))] } } });

  const referrer = await db.user.create({
    data: { walletAddress: A, agentId: "testreferrer.ai", refCode: "TESTREFERRER.AI", username: "testreferrer.ai" },
  });
  for (let i = 1; i <= 22; i++) {
    await db.user.create({
      data: { walletAddress: rnd(i), agentId: `miner${i}.ai`, refCode: `MINER${i}.AI`, username: `miner${i}.ai`, referredById: referrer.id, totalMined: i * 10 },
    });
  }

  // panggil API (dev server harus jalan di :3000)
  for (const page of [1, 2]) {
    const res = await fetch(`http://localhost:3000/api/referrals?address=${A}&page=${page}`);
    const json = await res.json();
    console.log(`page=${page} status=${res.status} total=${json.total} totalPages=${json.totalPages} items=${json.items?.length} first=${json.items?.[0]?.username} last=${json.items?.at(-1)?.username}`);
  }
  // invalid address
  const bad = await fetch("http://localhost:3000/api/referrals?address=0xzzz&page=1");
  console.log("invalid-address status=", bad.status);

  // cleanup
  await db.user.deleteMany({ where: { walletAddress: { in: [A, ...Array.from({ length: 22 }, (_, i) => rnd(i + 1))] } } });
  console.log("CLEANUP_OK");
}

main().finally(() => db.$disconnect());
