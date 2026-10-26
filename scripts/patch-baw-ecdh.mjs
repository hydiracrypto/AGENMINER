// Patch CLI @binance/agentic-wallet: alihkan import createECDH ke polyfill
// secp256k1 murni-JS agar CLI tetap jalan di runtime yang tak mendukung kurva
// tersebut (Bun → "Failed to create key using named curve").
// Idempoten: aman dijalankan berulang. Patch vendor/ + node_modules/ (dev).
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const POLY = join(root, "vendor/node_modules/@binance/agentic-wallet/dist/ecdh-secp256k1.mjs");
const TARGETS = [
  join(root, "vendor/node_modules/@binance/agentic-wallet/dist/index.js"),
  join(root, "node_modules/@binance/agentic-wallet/dist/index.js"),
];
const ORIG = 'import{createECDH as';
const PATCHED = '"./ecdh-secp256k1.mjs"';

let ok = 0;
for (const target of TARGETS) {
  if (!existsSync(target)) {
    console.log(`SKIP (tidak ada): ${target}`);
    continue;
  }
  const src = readFileSync(target, "utf8");
  if (src.includes(PATCHED)) {
    console.log(`SUDAH dipatch: ${target}`);
    ok++;
    continue;
  }
  const i = src.indexOf(ORIG);
  if (i === -1) {
    console.error(`GAGAL: pola import createECDH tidak ditemukan di ${target}`);
    process.exit(1);
  }
  // "import{createECDH as ua}from"node:crypto";" → ganti sumbernya saja
  const from = src.indexOf('from"node:crypto"', i);
  if (from === -1 || from - i > 80) {
    console.error(`GAGAL: posisi from"node:crypto" tidak wajar di ${target}`);
    process.exit(1);
  }
  const patched = src.slice(0, from) + `from${PATCHED}` + src.slice(from + 'from"node:crypto"'.length);
  writeFileSync(target, patched);
  console.log(`PATCHED: ${target}`);
  ok++;
}
// Pastikan polyfill ada di node_modules dev juga (untuk fallback candidate #4)
const devDist = join(root, "node_modules/@binance/agentic-wallet/dist");
if (existsSync(devDist) && !existsSync(join(devDist, "ecdh-secp256k1.mjs"))) {
  copyFileSync(POLY, join(devDist, "ecdh-secp256k1.mjs"));
  console.log("COPY polyfill → node_modules dist");
}
console.log(`Selesai: ${ok}/${TARGETS.length} target.`);
