# 🚀 Panduan Deploy Token AGENMINER di BNB Smart Chain Mainnet

Token **AGENTIC MINER (AGENMINER)** — BEP-20, suplai tetap **100.000.000**, desimal 18.

> ⚠️ **Peringatan:** Deploy mainnet menggunakan **BNB asli** untuk gas. Pastikan kamu paham risikonya (DYOR).
> Biaya deploy kontrak sederhana ini kira-kira **0.01 – 0.05 BNB** tergantung gas.

---

## Opsi A — Deploy via Remix (paling mudah, ±10 menit)

1. **Siapkan wallet**
   - Buka **Binance Web3 Wallet** (ekstensi browser / di dalam app Binance) atau MetaMask.
   - Pastikan jaringan **BNB Smart Chain (chain 56)** dan saldo **±0.05 BNB** untuk gas.

2. **Buka Remix**
   - Kunjungi `https://remix.ethereum.org`
   - Buat file baru: `AgenticMiner.sol` → salin seluruh isi `contracts/AgenticMiner.sol` dari proyek ini.

3. **Compile**
   - Tab **Solidity Compiler** → pilih versi `0.8.24` (atau ≥0.8.x) → klik **Compile AgenticMiner.sol**.
   - Pastikan tidak ada error.

4. **Deploy**
   - Tab **Deploy & Run** → Environment: **Injected Provider — MetaMask** (atau Binance Wallet).
   - Pastikan jaringan yang tampil: **BNB Smart Chain 56**.
   - Klik **Deploy** → konfirmasi di wallet → tunggu konfirmasi transaksi.

5. **Verifikasi kontrak (penting untuk kepercayaan komunitas)**
   - Salin alamat kontrak hasil deploy.
   - Buka `https://bscscan.com/address/<ALAMAT_KONTRAK>#code` → **Verify & Publish**.
   - Setting: compiler `0.8.24`, license MIT, license MIT, paste kode `AgenticMiner.sol` (single file, tanpa import).

6. **Distribusi suplai awal** (saran tokenomics)
   | Alokasi | Jumlah | Tujuan |
   |---|---|---|
   | Pool Mining | 70.000.000 | Kirim ke wallet "hot wallet" backend game |
   | Tim & Treasury | 10.000.000 | Wallet tim (vesting disarankan) |
   | Marketing | 10.000.000 | Kampanye, listing, KOL |
   | Likuiditas DEX | 10.000.000 | Pair AGENMINER/BNB di PancakeSwap |

7. **Tambah likuiditas** (opsional)
   - PancakeSwap → Add Liquidity → pair `AGENMINER/BNB`.

8. **Hubungkan ke aplikasi game ini**
   - Edit `src/lib/game-config.ts` → isi `contractAddress` dengan alamat kontrak.
   - Restart dev server. Badge "SEGERA DIUMUMKAN" di tab Wallet otomatis berganti jadi link BscScan.

---

## Opsi B — Deploy via Hardhat (untuk developer)

```bash
mkdir agenminer && cd agenminer
npm init -y
npm i --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init   # pilih "Create a JavaScript project"
# salin contracts/AgenticMiner.sol ke folder contracts/
```

`.env`:
```
BSC_RPC=https://bsc-dataseed.binance.org
PRIVATE_KEY=<private key wallet deployer, JANGAN commit ke git>
```

`hardhat.config.js`:
```js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    bscMainnet: {
      url: process.env.BSC_RPC,
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

`scripts/deploy.js`:
```js
async function main() {
  const Contract = await ethers.getContractFactory("AgenticMiner");
  const token = await Contract.deploy();
  await token.waitForDeployment();
  console.log("AGENMINER deployed to:", await token.getAddress());
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Jalankan:
```bash
npx hardhat run scripts/deploy.js --network bscMainnet
```

---

## Integrasi Backend Game (setelah kontrak aktif)

1. Backend game memegang **hot wallet** (owner) berisi pool mining 70 juta.
2. Permintaan penarikan pemain (status `PENDING` di tabel `Withdrawal`) diproses manual / oleh job:
   - Kumpulkan penerima + jumlah (mis. per jam / per hari).
   - Panggil `airdrop(recipients[], amounts[])` dari hot wallet — 1 transaksi untuk ≤200 penerima.
   - Simpan `txHash` dan ubah status menjadi `PROCESSED`.
3. Jumlah amount yang dikirim on-chain harus dikonversi ke 18 desimal:
   `amount(18 des) = amountGame × 10^18`

> 💡 Keamanan: gunakan wallet khusus backend, aktifkan whitelist, dan batasi saldo hot wallet.
