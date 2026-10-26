// Sinkron KODE INVITE = Agent ID untuk user yang sudah terdaftar.
// Aturan: bila user punya agentId format Agent ID Binance (…/.ai) dan refCode
// masih nilai lama (acak) → refCode diubah jadi agentId.toUpperCase().
// Jalankan sekali:  bun scripts/sync-refcode.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: { agentId: { not: null } },
    select: { id: true, walletAddress: true, username: true, agentId: true, refCode: true },
  });
  let changed = 0;
  for (const u of users) {
    const agentId = (u.agentId ?? "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*\.ai$/.test(agentId)) continue; // bukan Agent ID asli
    const wantRef = agentId.toUpperCase();
    if (u.refCode === wantRef) continue;
    try {
      await db.user.update({ where: { id: u.id }, data: { refCode: wantRef } });
      console.log(`SYNC ${u.walletAddress} :: ${u.refCode} → ${wantRef}`);
      changed++;
    } catch (e) {
      console.error(`SKIP ${u.walletAddress} (${(e as Error).message})`);
    }
  }
  console.log(`Selesai: ${changed} user diperbarui dari total ${users.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
