// RESET TOKENOMICS AGENMINER — kembalikan token ke kondisi awal (launch):
// - Hapus semua riwayat mining (MineLog)
// - Hapus semua riwayat penarikan + likuiditas (Withdrawal, LiquidityLog)
// - Hapus SEMUA user/wallet terdaftar (riwayat wallet terhubung)
//   → totalMined global = 0 → Mining Pool kembali penuh 70.000.000
//   → leaderboard kosong → sign-in berikutnya = registrasi baru dari nol
// Jalankan:  bun scripts/reset-token.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [mines, liq, wd, users] = await Promise.all([
    db.mineLog.count(),
    db.liquidityLog.count(),
    db.withdrawal.count(),
    db.user.count(),
  ]);
  console.log(`Kondisi saat ini: ${users} user, ${mines} riwayat mining, ${wd} withdrawal, ${liq} liquidity log.`);

  // Urutan penting: anak → induk (LiquidityLog → Withdrawal → User; MineLog cascade)
  const rLiq = await db.liquidityLog.deleteMany({});
  const rWd = await db.withdrawal.deleteMany({});
  const rMine = await db.mineLog.deleteMany({});
  const rUsers = await db.user.deleteMany({});
  console.log(`Dihapus: ${rMine.count} MineLog, ${rWd.count} Withdrawal, ${rLiq.count} LiquidityLog, ${rUsers.count} User.`);

  // Verifikasi
  const [u, m, agg] = await Promise.all([db.user.count(), db.mineLog.count(), db.user.aggregate({ _sum: { totalMined: true } })]);
  console.log(`Setelah reset: user=${u}, mineLog=${m}, totalMined=${agg._sum.totalMined ?? 0} → pool remaining penuh.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
