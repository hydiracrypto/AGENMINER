// Task 10-1: Wipe semua wallet/username agent yang terhubung di database
// Menghapus SEMUA User (wallet address + Agent ID username) + riwayat terkait.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, walletAddress: true, agentId: true, refCode: true },
  });
  console.log(`Ditemukan ${users.length} user di database:`);
  for (const u of users) {
    console.log(`  - ${u.walletAddress} | agentId=${u.agentId ?? "-"} | refCode=${u.refCode}`);
  }

  // Hapus berurutan (LiquidityLog → Withdrawal → MineLog → User)
  const liq = await prisma.liquidityLog.deleteMany({});
  const wd = await prisma.withdrawal.deleteMany({});
  const mines = await prisma.mineLog.deleteMany({});
  const del = await prisma.user.deleteMany({});

  console.log(
    `Dihapus: ${del.count} user, ${mines.count} mineLog, ${wd.count} withdrawal, ${liq.count} liquidityLog`
  );

  const after = await prisma.user.count();
  console.log(`Sisa user setelah wipe: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
