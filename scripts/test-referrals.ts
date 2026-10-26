// Test E2E API /api/referrals — seed 22 referred users lalu uji paginasi.
// Jalankan: bun scripts/test-referrals.ts (server dev harus jalan di :3000)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = "http://localhost:3000";

async function seed() {
  // Idempoten: hapus sisa data uji run sebelumnya
  await db.user.deleteMany({
    where: { walletAddress: { startsWith: "0xaaaaaaaaaa" } },
  });
  await db.user.deleteMany({
    where: { walletAddress: { startsWith: "0xbbbbbbbbbb" } },
  });
  await db.user.deleteMany({
    where: { walletAddress: { startsWith: "0xcccccccccc" } },
  });

  // Referrer utama
  const referrer = await db.user.create({
    data: {
      walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1",
      username: "Referrer Owner",
      agentId: "OWNER.TEST",
      refCode: "OWNER.TEST",
      avatar: "👑",
      totalMined: 1234.5,
      balance: 999,
    },
  });

  // 22 anggota tim → halaman 1 = 20, halaman 2 = 2, totalPages = 2
  for (let i = 1; i <= 22; i++) {
    await db.user.create({
      data: {
        walletAddress: `0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb${i.toString().padStart(2, "0")}`.slice(0, 42),
        username: `Team Miner ${i}`,
        agentId: `TEAM${i}`,
        refCode: `TEAM${i}`,
        referredById: referrer.id,
        totalMined: i * 10,
        avatar: "🤖",
      },
    });
  }
  // 1 user lain yang BUKAN anggota tim (tidak boleh ikut muncul)
  await db.user.create({
    data: { walletAddress: "0xcccccccccccccccccccccccccccccccccccccc", refCode: "STRANGER" },
  });
  console.log("seed OK");
}

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

async function run() {
  await seed();

  // 1) Halaman 1
  const p1 = await apiGet("/api/referrals?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1&page=1");
  console.log(
    "P1:",
    p1.status,
    "total=" + p1.body.total,
    "totalPages=" + p1.body.totalPages,
    "items=" + p1.body.items?.length,
    "first=" + p1.body.items?.[0]?.username,
    "agentId=" + p1.body.items?.[0]?.agentId,
    "wallet=" + p1.body.items?.[0]?.walletAddress
  );

  // 2) Halaman 2
  const p2 = await apiGet("/api/referrals?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1&page=2");
  console.log(
    "P2:",
    p2.status,
    "items=" + p2.body.items?.length,
    "last=" + p2.body.items?.at(-1)?.username
  );

  // 3) Halaman di luar jangkauan → clamp ke totalPages
  const p9 = await apiGet("/api/referrals?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1&page=99");
  console.log("P99 (clamp):", p9.status, "page=" + p9.body.page);

  // 4) Address tidak terdaftar → 404
  const nf = await apiGet("/api/referrals?address=0xdddddddddddddddddddddddddddddddddddddddd&page=1");
  console.log("Unregistered:", nf.status, nf.body.error);

  // 5) Address invalid → 400
  const inv = await apiGet("/api/referrals?address=0x123&page=1");
  console.log("Invalid addr:", inv.status, inv.body.error);

  // 6) Urutan: terbaru dulu (Team Miner 22 di P1 pertama)
  const order = await apiGet("/api/referrals?address=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1&page=1");
  console.log("Order first item:", order.body.items[0].username, "(harus Team Miner 22)");
}

run()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("TEST FAIL:", e);
    process.exit(1);
  });
