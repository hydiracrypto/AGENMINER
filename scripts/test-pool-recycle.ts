// Verifikasi daur ulang pool: token bakaran upgrade kembali ke pool 70M
// tanpa membuka celah eksploit cap pribadi 7.000/wallet.
import { effectivePoolRemaining, upgradeCost, GAME, TOKEN, remainingCap } from "../src/lib/game-config";

let fail = 0;
const expect = (cond: boolean, msg: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fail++;
};

// 1. Rumus dasar
expect(effectivePoolRemaining(0, 0) === 70_000_000, "Pool baru: 70.000.000 penuh");
expect(effectivePoolRemaining(1_000_000, 0) === 69_000_000, "1 jt ditambang → sisa 69 jt");
expect(effectivePoolRemaining(70_000_000, 0) === 0, "Pool habis tanpa daur ulang");
expect(effectivePoolRemaining(70_000_000, 400) === 400, "Pool habis + daur ulang 400 → sisa 400");
expect(effectivePoolRemaining(70_000_000, 5_000) === 5_000, "Daur ulang 5.000 → pool hidup lagi 5.000");
expect(effectivePoolRemaining(69_999_800, 400) === 600, "Sisa 200 + daur ulang 400 = 600");
expect(effectivePoolRemaining(0, 1_000) === 70_000_000, "Clamp atas: tidak melebihi 70M");
expect(effectivePoolRemaining(70_000_000, -500) === 0, "Input daur ulang negatif diabaikan");

// 2. Simulasi siklus: tambang → cap → upgrade (bakar) → pool dapat kredit
//    wallet lain bisa menambang kredit itu; wallet pembakar TIDAK bisa tambang ulang.
let minedA = 0; // totalMined wallet A (pembakar)
let poolUsed = minedA; // konsumsi pool = sum totalMined semua wallet (A saja dlm simulasi)
let recycled = 0;
const sequence: Array<[string, number]> = [
  ["mine", 7_000], // A tambang sampai cap penuh
  ["upgrade", upgradeCost(1)], // 400
  ["upgrade", upgradeCost(2)], // 660
  ["upgrade", upgradeCost(3)], // 1.089
  ["upgrade", upgradeCost(4)], // 1.797
  ["upgrade", upgradeCost(5)], // 2.965 → total bakar 6.911
];
for (const [act, val] of sequence) {
  if (act === "mine") {
    const amt = Math.min(val, remainingCap(minedA), effectivePoolRemaining(poolUsed, recycled));
    minedA += amt;
    poolUsed = minedA;
  } else {
    // upgrade: saldo berkurang val, pool dapat kredit val, totalMined TIDAK berubah
    recycled += val;
  }
}
const burn = recycled;
expect(minedA === 7_000, `Wallet A cap penuh 7.000 (totalMined=${minedA})`);
expect(burn === 6_911, `Total bakaran upgrade = 6.911 (99% cap)`);
expect(effectivePoolRemaining(poolUsed, recycled) === 70_000_000 - poolUsed + burn, "Pool efektif = 70M − ditambang + kredit daur ulang 6.911");
expect(effectivePoolRemaining(poolUsed, recycled) > effectivePoolRemaining(poolUsed, 0), "Daur ulang membuat pool lebih besar dari tanpa daur ulang (+6.911)");
expect(remainingCap(minedA) === 0, "Cap pribadi A = 0 — TIDAK terisi ulang (anti-eksploit)");
// A coba tambang lagi → clamp = 0
const retry = Math.min(1_000, remainingCap(minedA), effectivePoolRemaining(poolUsed, recycled));
expect(retry === 0, "A mencoba menambang lagi → 0 (tidak ada celah)");

// 3. Konsistensi: sisa withdraw A + bakaran = cap (tidak ada token hilang / diciptakan)
//    balance A = 7.000 - 6.911 = 89 → semua terhitung: 89 (withdrawable) + 6.911 (kembali ke pool)
expect(7_000 - burn === 89, "Sisa saldo A = 89; 89 (withdraw) + 6.911 (pool) = 7.000 — akuntansi tertutup");

console.log(`\nPool: ${TOKEN.miningPool.toLocaleString()} | Cap/wallet: ${GAME.perWalletCap.toLocaleString()}`);
console.log(`${fail === 0 ? "ALL PASS" : `${fail} FAIL`}`);
if (fail > 0) process.exit(1);
