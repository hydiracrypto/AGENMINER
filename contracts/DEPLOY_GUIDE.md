# 🚀 Panduan Deploy Token AGENMINER di BNB Smart Chain Mainnet

Token **AGENTIC MINER (AGENMINER)** — BEP-20, **hard cap 100.000.000**, desimal 18.

> ⚠️ **Peringatan:** Deploy mainnet menggunakan **BNB asli** untuk gas. Pastikan kamu paham risikonya (DYOR).
> Biaya deploy kontrak sederhana ini kira-kira **0.01 – 0.05 BNB** tergantung gas.

---

## Model Auto-Mint Penarikan (penting dipahami dulu)

Kontrak ini **tidak mencetak 100 juta saat deploy**. Sebaliknya, suplai dicetak **on-demand** oleh backend game (owner):

1. Pemain menarik game-balance AGENMINER dari aplikasi.
2. Backend memanggil kontrak:
   ```solidity
   mintWithdrawal(walletPemain, totalAmountWei, feeBps)
   // feeBps = 1000 (10%) → fee di-mint ke liquidityPool (pair PancakeSwap)
   // sisanya (net 90%) di-mint langsung ke wallet pemain
   ```
3. **Fee penarikan otomatis masuk likuiditas DEX PancakeSwap** karena di-mint
   langsung ke address pair AGENMINER/BNB. Pasangkan dengan BNB (addLiquidity)
   atau panggil `pair.sync()` agar reserve ter-update.
4. Total suplai **tidak pernah** bisa melebihi 100.000.000 (`MAX_SUPPLY`) —
   dicek matematis di setiap mint.

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
   - Tidak perlu distribusi suplai awal — kontrak mulai dari totalSupply = 0.

5. **Verifikasi kontrak (penting untuk kepercayaan komunitas)**
   - Salin alamat kontrak hasil deploy.
   - Buka `https://bscscan.com/address/<ALAMAT_KONTRAK>#code` → **Verify & Publish**.
   - Setting: compiler `0.8.24`, license MIT, paste kode `AgenticMiner.sol` (single file, tanpa import).

6. **Set pair PancakeSwap (untuk fee likuiditas)**
   - Buat pair **AGENMINER/BNB** di PancakeSwap V2 Factory:
     `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` (atau pakai Router
     `0x10ED43C718714eb63d5aA57B78B54704E256024E` → Add Liquidity sekali
     untuk membuat pair).
   - Panggil `setLiquidityPool(<alamat pair>)` dari wallet owner.
   - Seed likuiditas awal (saran): `mintOwner(walletTim, 10_000_000e18)` untuk
     alokasi Likuiditas DEX 10% → addLiquidity AGENMINER/BNB di PancakeSwap.

7. **Alokasi tokenomics** (via `mintOwner`, total tetap ≤ 100M)
   | Alokasi | Jumlah | Cara |
   |---|---|---|
   | Pool Mining | 70.000.000 | Dicetak otomatis via `mintWithdrawal` saat pemain menarik |
   | Tim & Treasury | 10.000.000 | `mintOwner(walletTim, ...)` |
   | Marketing | 10.000.000 | `mintOwner(walletMarketing, ...)` |
   | Likuiditas DEX | 10.000.000 | `mintOwner(walletLP, ...)` → addLiquidity PancakeSwap |

8. **Hubungkan ke aplikasi game ini**
   - Edit `src/lib/game-config.ts` → isi `contractAddress` dan `PANCAKESWAP.pair`.
   - Set env `MINTER_KEY` (private key wallet owner backend) di environment server.
   - Restart dev server. Penarikan pemain kini **auto-mint on-chain** (mode "onchain").
     Sebelum kontrak diisi, sistem berjalan mode "simulated" (mint tercatat instan di DB).

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

1. Isi env server:
   ```
   MINTER_KEY=<private key wallet owner>   # dipakai src/lib/onchain-mint.ts
   ```
   dan `TOKEN.contractAddress` di `src/lib/game-config.ts`.
2. Penarikan pemain otomatis diproses oleh `POST /api/withdraw`:
   - Pecahan otomatis: **90% net** → mint ke wallet pemain, **10% fee** → mint ke pair PancakeSwap (likuiditas).
   - Setiap fee tercatat di tabel `LiquidityLog` untuk transparansi di tab Wallet.
   - Status penarikan langsung `PROCESSED` (MINTED) — tidak ada antrean manual.
3. Fallback tanpa kontrak: sistem tetap jalan mode **simulated** (instan),
   lalu semua penarikan historis bisa dieksekusi on-chain setelah kontrak aktif.
4. Konversi jumlah ke 18 desimal dilakukan otomatis oleh `onchain-mint.ts`
   (`ethers.parseUnits(..., 18)`), feeBps = `WITHDRAW.feePct × 100` (10% → 1000).

> 💡 Keamanan: gunakan wallet khusus backend (bukan wallet pribadi), aktifkan
> whitelist, batasi saldo, dan simpan `MINTER_KEY` hanya di environment server.
