// Seed data uji visual untuk inspeksi browser Friends tab.
// Owner: 0xaaaa...a1 (refCode OWNER.TEST) + 22 anggota tim + 1 stranger.
// Jalankan: bun scripts/seed-visual.ts  (server dev harus jalan)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.user.deleteMany({ where: { walletAddress: { startsWith: "0xa" } } });
  await db.user.deleteMany({ where: { walletAddress: { startsWith: "0xb" } } });
  await db.user.deleteMany({ where: { walletAddress: { startsWith: "0xc" } } });

  const referrer = await db.user.create({
    data: {
      walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1",
      username: "everhand.ai",
      agentId: "everhand.ai",
      refCode: "EVERHAND.AI",
      avatar: "👑",
      totalMined: 1234.5,
      balance: 999,
      refEarnings: 87.3,
      verifiedAgent: true,
      miningPower: 3,
    },
  });

  for (let i = 1; i <= 22; i++) {
    await db.user.create({
      data: {
        walletAddress: `0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb${i.toString().padStart(2, "0")}`.slice(0, 42),
        username: `TeamMiner${i}`,
        agentId: `TEAM${i}`,
        refCode: `TEAM${i}`,
        referredById: referrer.id,
        totalMined: i * 137,
        balance: i * 50,
        avatar: ["🤖", "🚀", "🔥", "⚡"][i % 4],
        verifiedAgent: i % 3 === 0,
      },
    });
  }

  await db.user.create({
    data: { walletAddress: "0xcccccccccccccccccccccccccccccccccccccc", refCode: "STRANGER" },
  });
  console.log("seed visual OK");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
