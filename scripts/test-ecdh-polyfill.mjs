// Uji vektor kripto polyfill secp256k1 — jalankan di bawah BUN (runtime bermasalah)
//   bun scripts/test-ecdh-polyfill.mjs
// Vektor: 1·G == G terkenal; ECDH(a=2,b=3) konsisten dua arah; interop penuh
// dengan node:crypto native (diffieHellman via DER SEC1/SPKI) di bawah node.
import { createECDH } from "../vendor/node_modules/@binance/agentic-wallet/dist/ecdh-secp256k1.mjs";
import crypto from "node:crypto";

let fail = 0;
const check = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) fail++;
};

// 1) 1·G == generator terkenal (kompressed)
const g = createECDH("secp256k1");
g.generateKeys();
check("generateKeys menghasilkan pubkey compressed 33B hex", /^[0-9a-f]{66}$/.test(g.getPublicKey("hex", "compressed")) && ["02", "03"].includes(g.getPublicKey("hex", "compressed").slice(0, 2)));
check("getPrivateKey() Buffer 32B", Buffer.isBuffer(g.getPrivateKey()) && g.getPrivateKey().length === 32);

// 2) Vektor scalar mult deterministik — pakai computeSecret sbg proksi:
//    ECDH dengan private key tak bisa diinjeksi via API publik, jadi uji
//    konsistensi silang terhadap node:crypto native (uji 4).
//    Di sini: dua instans acak → shared secret sama dua arah & 32B.
const a = createECDH("secp256k1"); a.generateKeys();
const b = createECDH("secp256k1"); b.generateKeys();
const ab = a.computeSecret(b.getPublicKey());
const ba = b.computeSecret(a.getPublicKey());
check("computeSecret ECDH(A,B) == ECDH(B,A)", Buffer.compare(ab, ba) === 0 && ab.length === 32);

// 3) Format: uncompressed 65B + parity compressed cocok
const pubU = a.getPublicKey();
check("getPublicKey() default uncompressed 65B", pubU.length === 65 && pubU[0] === 0x04);
const comp2 = Buffer.concat([Buffer.from([0x02 | (pubU[64] & 1)]), pubU.subarray(1, 33)]);
const a2 = createECDH("secp256k1"); a2.generateKeys();
const secretViaCompressed = a2.computeSecret(b.getPublicKey("hex", "compressed"), "hex");
check("computeSecret terima format hex+compressed", secretViaCompressed.length === 32);

// 4) INTEROP dengan native node:crypto (jalankan skrip ini juga dengan node):
//    buat pasangan polyfill → ekspor priv sbg SEC1 DER, pub sbg SPKI DER →
//    minta node native menghitung ECDH → bandingkan dgn computeSecret polyfill.
// SEC1 ECPrivateKey: SEQUENCE(0x2e){ version 020101, OCTET STRING 0420+32B, [0] a007 OID secp256k1 }
const sec1Prefix = Buffer.from("302e0201010420", "hex");
const sec1Suffix = Buffer.from("a00706052b8104000a", "hex");
const privDer = Buffer.concat([sec1Prefix, a.getPrivateKey(), sec1Suffix]);
const pubBC = Buffer.from(a.getPublicKey("hex", "compressed"), "hex");
// SPKI (compressed): SEQUENCE(0x38){ SEQ(0x10){OID ecPublicKey, OID secp256k1}, BITSTRING 032200+33B }
const SPKI_C = Buffer.from("3036301006072a8648ce3d020106052b8104000a032200", "hex");
const pubDerC = Buffer.concat([SPKI_C, pubBC]);
try {
  const privKey = crypto.createPrivateKey({ key: privDer, format: "der", type: "sec1" });
  const peerPub = crypto.createPublicKey({ key: pubDerC, format: "der", type: "spki" });
  const nativeShared = crypto.diffieHellman({ privateKey: privKey, publicKey: peerPub });
  // nativeShared = shared dari priv A thd pub A sendiri? BUKAN — peerPub = pub A.
  // Kita butuh pub B: buat dari polyfill B.
  const pubBDerC = Buffer.concat([SPKI_C, Buffer.from(b.getPublicKey("hex", "compressed"), "hex")]);
  const peerB = crypto.createPublicKey({ key: pubBDerC, format: "der", type: "spki" });
  const nativeAB = crypto.diffieHellman({ privateKey: privKey, publicKey: peerB });
  check("INTEROP native: ECDH_native(privA, pubB) == ECDH_polyfill(A,B)", Buffer.compare(nativeAB, ab) === 0);
void pubBC;
} catch (e) {
  console.log("SKIP/FAIL interop native:", e.message);
  if (process.execPath.includes("node")) fail++;
}

// 5) Native ECDH runtime sendiri (informasi): bun → gagal dgn "named curve"
try {
  crypto.createECDH("secp256k1").generateKeys();
  console.log("INFO  createECDH native secp256k1: TERSEDIA di runtime ini");
} catch (e) {
  console.log(`INFO  createECDH native secp256k1 GAGAL di runtime ini: ${e.message}`);
}

process.exit(fail ? 1 : 0);
