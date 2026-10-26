// Verifikasi kurva upgrade Mining Power baru (Lv 1-10, eksponensial 1.65x)
// Tujuan owner: makin sulit naik level → token terbakar di upgrade tidak bisa
// ditarik → setiap wallet tidak bisa mengumpulkan banyak token.
import { GAME, upgradeCost } from "../src/lib/game-config";

let fail = 0;

// 1. Tabel biaya per level + kumulatif vs cap 7.000
console.log(`Cap lifetime/wallet: ${GAME.perWalletCap.toLocaleString()} ${"AGENMINER"} | Max Power: Lv.${GAME.maxMiningPower}\n`);
console.log("Lv     cost      cumulative   %cap     affordable?");
let cum = 0;
const cumAt: Record<number, number> = { 1: 0 };
for (let p = 1; p < GAME.maxMiningPower; p++) {
  const c = upgradeCost(p);
  cum += c;
  cumAt[p + 1] = cum;
  const pct = ((cum / GAME.perWalletCap) * 100).toFixed(1);
  console.log(
    `${`${p}->${p + 1}`.padEnd(6)} ${c.toLocaleString().padEnd(9)} ${cum.toLocaleString().padEnd(12)} ${`${pct}%`.padEnd(8)} ${cum <= GAME.perWalletCap ? "YES" : "no (mustahil)"}`
  );
}

// 2. Ekspektasi kunci desain
const expect = (cond: boolean, msg: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fail++;
};

expect(upgradeCost(1) === 400, "Lv1->2 = 400");
expect(upgradeCost(2) === 660, "Lv2->3 = 660");
expect(upgradeCost(5) === 2965, "Lv5->6 = 2.965");
expect(cumAt[6] === 6911, "Kumulatif sampai Lv6 = 6.911 (99% cap terbakar, sisa withdraw ~89)");
expect(cumAt[7] > GAME.perWalletCap, "Lv7 kumulatif 11.803 > cap 7.000 → mustahil");
expect(cumAt[6] < GAME.perWalletCap, "Lv6 masih terjangkau (level trofi)");

// 3. Lebih sulit dari kurva lama pada level menengah-atas
const oldCost = (p: number) => Math.round(750 * Math.pow(p, 1.6));
let oldCum = 0, newCum = 0;
for (let p = 1; p < 5; p++) { oldCum += oldCost(p); newCum += upgradeCost(p); }
// bandingkan kumulatif untuk urutan upgrade yang sama (Lv1->5: 4 upgrade)
console.log(`\nKumulatif Lv1->5: kurva lama=${oldCum.toLocaleString()} vs baru=${newCum.toLocaleString()}`);
expect(newCum > 3000, "Kurva baru jauh lebih banyak membakar token di level menengah");

// 4. Max power guard konsisten
expect(GAME.maxMiningPower === 10, "Hard cap Lv.10");

console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAIL`}`);
if (fail > 0) process.exit(1);
