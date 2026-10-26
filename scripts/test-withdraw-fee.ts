// Verifikasi: splitWithdrawal (DB) === mintWithdrawal fee split (kontrak, level wei)
// Kontrak: fee = floor(amountWei * feeBps / 10000), net = amountWei - fee
// DB     : splitWithdrawal(amount) → fee/net eksak 4 desimal
import { splitWithdrawal, WITHDRAW } from "../src/lib/game-config";

const ONE_W = BigInt(10 ** 18);
const B10000 = BigInt(10000);

// Simulasi matemika wei kontrak tanpa ethers (BigInt murni)
function contractSplit(amountDecimal: string, feeBps: number) {
  const [int, frac = ""] = amountDecimal.split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  const amountWei = BigInt(int + fracPadded);
  const feeWei = (amountWei * BigInt(feeBps)) / B10000; // floor, seperti Solidity
  const netWei = amountWei - feeWei;
  return { feeWei, netWei };
}

function weiToDecimal4(wei: bigint): string {
  // trunc ke 4 desimal token utk pembandingan dgn DB
  const SCALE = BigInt(10 ** 14); // 10^(18-4)
  const scaled = wei / SCALE; // = amount x 10000 (integer, truncated)
  const int = scaled / BigInt(10000);
  const frac = (scaled % BigInt(10000)).toString().padStart(4, "0");
  return `${int}.${frac}`;
}

const cases = [
  "10.56", "10.55", "100", "0.01", "0.1", "1234.56", "7000", "6999.99",
  "0.05", "33.33", "1.01", "999.99", "77.77", "0.99", "12345.67",
];

const feeBps = Math.round(WITHDRAW.feePct * 100); // 500
let pass = 0, fail = 0;

for (const c of cases) {
  const db = splitWithdrawal(Number(c));
  const ct = contractSplit(c, feeBps);
  const ctFee = weiToDecimal4(ct.feeWei);
  const ctNet = weiToDecimal4(ct.netWei);
  const dbFee = db.fee.toFixed(4);
  const dbNet = db.net.toFixed(4);
  const ok = dbFee === ctFee && dbNet === ctNet && Math.abs(db.fee + db.net - Number(c)) < 1e-9;
  if (ok) pass++; else fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  amount=${c.padEnd(10)} DB fee=${dbFee.padEnd(10)} net=${dbNet.padEnd(12)} | contract fee=${ctFee.padEnd(10)} net=${ctNet}`
  );
}

// Cek kuantisasi floor: input 3 desimal → dipotong ke 2 desimal
const q = splitWithdrawal(10.555);
console.log(`quantize 10.555 → total=${(q.fee + q.net).toFixed(4)} (harus 10.55)`);
if (Math.abs(q.fee + q.net - 10.55) > 1e-9) fail++;

// Cek dust: input < 0.01 → {0,0}
const d = splitWithdrawal(0.001);
if (d.fee !== 0 || d.net !== 0) { fail++; console.log("FAIL dust guard"); } else console.log("PASS dust guard (0.001 → {0,0})");

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
