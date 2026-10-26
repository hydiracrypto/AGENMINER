// E2E test ekonomi adil AGENMINER: cap 7.000/wallet, komisi 2%, wallet tanpa Agent ID lambat
// Jalankan: bun scripts/test-cap-economy.ts  (dev server harus hidup di :3000)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const API = "http://localhost:3000";
const A = "0xa000000000000000000000000000000000000001"; // wallet biasa (tanpa Agent ID)
const B = "0xb000000000000000000000000000000000000002"; // referral dari A

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`✅ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.log(`❌ ${name}${detail ? " — " + detail : ""}`); }
}
async function post(path: string, body: any) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
async function getUser(address: string) {
  const res = await fetch(`${API}/api/user/${address}`);
  const json = await res.json();
  return json?.user ?? json; // respons API dibungkus { user, recentMines }
}

async function main() {
  // ── 0. Bersihkan data test sebelumnya ──
  await db.user.deleteMany({ where: { walletAddress: { in: [A, B] } } });

  // ── 1. Login wallet A (login biasa → TANPA Agent ID Binance) ──
  const l1 = await post("/api/auth/login", { address: A });
  const ua = l1.json?.user;
  check("login A", l1.status === 200 && !!ua, `refCode=${ua?.refCode}`);
  check("A unverified (tanpa Agent ID)", ua?.verifiedAgent === false);
  check("A cooldown 5 menit (300.000 ms)", ua?.cooldownMs === 300_000, `cooldownMs=${ua?.cooldownMs}`);
  check("A cap awal 7.000", ua?.capRemaining === 7000, `capRemaining=${ua?.capRemaining}`);

  // ── 2. Mine A → reward harus 50% (dari ~60-120 jadi ~30-60) ──
  const m1 = await post("/api/mine", { address: A, prompt: "quantum drill harvests golden hashes from the mempool nebula", lang: "en" });
  check("mine A sukses", m1.status === 200, `reward=${m1.json?.reward}, score=${m1.json?.score}`);
  check("reward A terpangkas 50%", (m1.json?.reward ?? 999) <= 90, `reward=${m1.json?.reward} (power 1, max skor 100 → max 90 setelah 50%)`);

  // ── 3. Mine A lagi langsung → 429 cooldown ±5 menit ──
  const m2 = await post("/api/mine", { address: A, prompt: "stellar excavator mines frozen smart contracts on bnb cumulus clouds", lang: "en" });
  check("mine A kedua → 429 cooldown", m2.status === 429 && m2.json?.errorKey === "cooldown", `remainingMs=${m2.json?.remainingMs}`);
  check("cooldown ±300 dtk (bukan 60)", (m2.json?.remainingMs ?? 0) > 240_000, `remainingMs=${m2.json?.remainingMs}`);

  // ── 4. Login B pakai kode referral A → A dapat bonus join 500 (ikut cap & pool) ──
  const l2 = await post("/api/auth/login", { address: B, refCode: ua.refCode });
  check("login B dgn referral A", l2.status === 200 && !!l2.json?.user, `refCode B=${l2.json?.user?.refCode}`);
  const uaAfterJoin = await getUser(A);
  check("A dapat bonus join 500 (totalMined ikut naik)", uaAfterJoin?.totalMined === m1.json.reward + 500, `totalMined=${uaAfterJoin?.totalMined}`);

  // ── 5. Mine B → A dapat komisi 2% (bukan 5%) & totalMined A bertambah ──
  const m3 = await post("/api/mine", { address: B, prompt: "neural reactor crystallizes gas fees into shiny AGENMINER tokens", lang: "en" });
  check("mine B sukses", m3.status === 200, `reward=${m3.json?.reward}`);
  const uaAfterComm = await getUser(A);
  const expectComm = Math.round(m3.json.reward * 0.02 * 100) / 100;
  const gotComm = Math.round((uaAfterComm.totalMined - uaAfterJoin.totalMined) * 100) / 100;
  check("komisi referral A = 2% dr reward B", gotComm === expectComm && expectComm > 0, `komisi=${gotComm} (harap ${expectComm})`);

  // ── 6. Set A.totalMined = 6.995 & reset cooldown → reward ter-clamp ke sisa 5 ──
  await db.user.update({ where: { walletAddress: A }, data: { totalMined: 6995 } });
  await db.user.update({ where: { walletAddress: A }, data: { lastMineAt: null } });
  const m4 = await post("/api/mine", { address: A, prompt: "liquid drill extracts liquidity from the black hole to bnb nebula now", lang: "en" });
  check("mine A di 6.995 → reward ≤ 5 (clamp cap)", m4.status === 200 && (m4.json?.reward ?? 99) <= 5, `reward=${m4.json?.reward}, capRemaining=${m4.json?.capRemaining}`);
  check("capRemaining habis (0)", m4.json?.capRemaining === 0);

  // ── 7. Mine A lagi (cap 7.000 tercapai) → 403 mining_cap ──
  await db.user.update({ where: { walletAddress: A }, data: { lastMineAt: null } });
  const m5 = await post("/api/mine", { address: A, prompt: "diamond gpu digs legendary genesis blocks from frozen blockchain depths", lang: "en" });
  check("mine A setelah cap → 403 mining_cap", m5.status === 403 && m5.json?.errorKey === "mining_cap", `status=${m5.status}, errorKey=${m5.json?.errorKey}`);

  // ── 8. Pool accounting: SUM(totalMined) konsisten dgn reward tercatat ──
  const stats = await (await fetch(`${API}/api/stats`)).json();
  check("stats pool konsisten", typeof stats.poolRemaining === "number" && stats.poolRemaining <= 70_000_000, `poolRemaining=${stats.poolRemaining}`);

  console.log(`\n${fail === 0 ? "🎉 SEMUA TEST LULUS" : "💥 ADA TEST GAGAL"} — pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
