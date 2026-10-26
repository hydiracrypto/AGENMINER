// ============================================
// AGENTIC MINER — Konfigurasi Token & Formula Game
// ============================================

export const TOKEN = {
  name: "AGENTIC MINER",
  symbol: "AGENMINER",
  emoji: "⛏️",
  decimals: 18,
  totalSupply: 100_000_000, // 100 juta
  miningPool: 70_000_000, // 70% pool mining
  teamTreasury: 10_000_000, // 10% tim & treasury
  marketing: 10_000_000, // 10% marketing
  liquidity: 10_000_000, // 10% likuiditas DEX
  chainId: 56, // BNB Smart Chain Mainnet
  chainIdHex: "0x38",
  chainName: "BNB Smart Chain",
  chainShort: "BNB Chain",
  rpcUrl: "https://bsc-dataseed.binance.org",
  explorer: "https://bscscan.com",
  // ⚠️ Isi alamat kontrak BEP-20 setelah deploy (lihat contracts/DEPLOY_GUIDE.md)
  contractAddress: "",
} as const;

// ============================================
// PENARIKAN OTOMATIS — AUTO MINT + FEE LIKUIDITAS PANCAKESWAP
// ============================================
export const WITHDRAW = {
  autoMint: true, // penarikan langsung di-mint otomatis ke wallet BNB Chain user
  feePct: 5, // 5% fee penarikan → masuk likuiditas DEX PancakeSwap
} as const;

/** PancakeSwap (BNB Smart Chain / chain 56) */
export const PANCAKESWAP = {
  dex: "PancakeSwap V2",
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
  // Pair AGENMINER/BNB — isi setelah pair dibuat (lihat contracts/DEPLOY_GUIDE.md)
  pair: "",
} as const;

/**
 * Pecahkan jumlah penarikan → net ke wallet + fee ke likuiditas PancakeSwap.
 * Matematika DIJAMIN identik dengan kontrak `mintWithdrawal`:
 *   fee = amount_wei x feeBps / 10000 (pembagian bulat di level wei).
 * Amount dikuantisasi ke 2 desimal (floor — tidak pernah melebihi input),
 * lalu fee dihitung eksak 4 desimal, sehingga catatan DB (fee/net) selalu
 * persis sama dengan pembagian on-chain (deviasi 0.528 vs 0.53 hilang).
 */
export function splitWithdrawal(amount: number): { net: number; fee: number } {
  const amt = Math.floor(amount * 100 + 1e-9) / 100; // kuantisasi 2 desimal, anti float-noise
  if (amt <= 0) return { net: 0, fee: 0 };
  const fee = Math.round(amt * WITHDRAW.feePct * 100) / 10000; // eksak 4 desimal (mis. 0.528)
  const net = Math.round((amt - fee) * 10000) / 10000;
  return { net, fee };
}

// ============================================
// EKONOMI DISTRIBUSI ADIL (permintaan owner):
// - Cap lifetime 7.000 AGENMINER per wallet utk SEMUA reward game
//   (mining AI prompt + check-in + komisi referral + bonus join).
// - Pool 70.000.000 ÷ 7.000 = MAKSIMAL 10.000 holder full-cap →
//   pool terjamin terbagi ke 7.000–10.000 wallet holder.
// - Wallet TANPA Agent ID Binance asli (verifiedAgent=false):
//   cooldown 5 menit + reward 50% → perolehan lebih lambat & adil.
// - Mining Power Lv 1–10 (hard cap) + kurva biaya eksponensial 1,65x
//   per level → token terbakar di upgrade TIDAK bisa ditarik, jadi
//   wallet pemburu level tinggi otomatis menyerahkan hampir semua
//   jatahnya (Lv6 = 99% cap terbakar; Lv7+ matematis mustahil).
// ============================================
export const GAME = {
  cooldownMs: 60_000, // jeda antar mining (wallet dgn Agent ID): 60 detik
  minPromptLen: 15,
  maxPromptLen: 500,
  baseReward: 25, // reward dasar per mining
  scoreMultiplier: 0.6, // bonus = skor AI (0-100) x 0.6
  streakBonusPerDay: 0.05, // +5% per hari streak
  maxStreakBonus: 0.5, // maksimal +50%
  referrerJoinBonus: 500, // bonus undangan untuk pengundang (ikut cap 7.000)
  refCommission: 0.02, // komisi 2% dari reward (diturunkan dr 5% agar pool tahan sampai 7.000-10.000 holder)
  checkinBaseReward: 100, // reward check-in harian dasar
  minWithdraw: 0, // TANPA minimal penarikan — tarik berapa pun!
  recentPromptLimit: 10, // cek duplikat 10 prompt terakhir
  perWalletCap: 7_000, // cap lifetime reward per wallet (semua sumber reward)
  noAgentIdCooldownMs: 300_000, // wallet TANPA Agent ID: cooldown 5 menit
  noAgentIdRewardMult: 0.5, // wallet TANPA Agent ID: reward 50%
  maxMiningPower: 10, // Mining Power Lv 1–10 — di atas itu tidak bisa upgrade
} as const;

/** Cooldown efektif per wallet: 60 dtk (verified Agent ID) / 5 mnt (tanpa) */
export function effectiveCooldownMs(verifiedAgent: boolean): number {
  return verifiedAgent ? GAME.cooldownMs : GAME.noAgentIdCooldownMs;
}

/** Sisa jatah lifetime wallet terhadap cap 7.000 */
export function remainingCap(totalMined: number): number {
  return Math.max(0, GAME.perWalletCap - totalMined);
}

/**
 * Sisa pool mining global EFEKTIF — token yang dibakar untuk upgrade
 * Mining Power didaur ulang kembali ke pool 70.000.000, jadi tidak ada
 * token yang terbakar sia-sia:
 *   efektif = miningPool − totalDitambang + totalDidaurUlang
 * Diclamp ke [0, miningPool]. Catatan: cap pribadi 7.000/wallet tetap
 * dihitung dari totalMined (tidak pernah berkurang) — daur ulang hanya
 * menambah ketersediaan pool untuk wallet lain, bukan mengisi ulang cap.
 */
export function effectivePoolRemaining(globalMined: number, totalRecycled: number): number {
  return Math.max(0, Math.min(TOKEN.miningPool, TOKEN.miningPool - globalMined + Math.max(0, totalRecycled)));
}

/** Clamp jumlah reward agar totalMined tidak melampaui cap 7.000 */
export function clampToCap(totalMined: number, amount: number): number {
  return Math.max(0, Math.min(amount, remainingCap(totalMined)));
}

/**
 * Biaya upgrade Mining Power ke level berikutnya (Lv 1–10, hard cap).
 * Kurva eksponensial 1,65x per level — JAUH lebih sulit dari kurva lama
 * (750 x p^1.6). Token yang dibakar di upgrade tidak bisa ditarik, jadi
 * dengan cap lifetime 7.000/wallet:
 *   Lv5 kumulatif 3.946 (56% cap terbakar) • Lv6 kumulatif 6.911 (99%,
 *   level trofi — sisa withdraw cuma ~89) • Lv7 kumulatif 11.803 →
 *   matematis mustahil dicapai.
 */
export function upgradeCost(currentPower: number): number {
  return Math.round(400 * Math.pow(1.65, currentPower - 1));
}

/** Multiplier streak berdasarkan hari beruntun */
export function streakMultiplier(streak: number): number {
  return Math.min(1 + streak * GAME.streakBonusPerDay, 1 + GAME.maxStreakBonus);
}

/** Hitung reward mining: (base + skor x mult) x power x streakMult */
export function computeReward(score: number, power: number, streak: number): number {
  const raw = (GAME.baseReward + score * GAME.scoreMultiplier) * power * streakMultiplier(streak);
  return Math.round(raw);
}

/** Reward check-in harian */
export function computeCheckinReward(power: number, streak: number): number {
  return Math.round(GAME.checkinBaseReward * power * streakMultiplier(streak));
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function fmtNum(n: number, decimals = 2, lang: "zh" | "en" = "zh"): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

const PROMPT_EXAMPLES_ZH: string[] = [
  "用量子AI的超高速从BNB Chain银河中心挖出一个全新区块！",
  "潜入内存池深处，收割自2021年以来等待的黄金交易",
  "点燃神经网络反应堆，把Gas哈希结晶成AGENMINER",
  "训练一万名AI智能体在BNB积雨云上开采加密雨伞",
  "用等离子钻头从黑洞中抽取流动性，直通BNB星云",
  "启动钻石GPU，在冻结的区块链中挖掘传奇智能合约",
  "派一支机器人钻探队登上月球，把月岩代币舀进我的钱包",
  "部署999个纳米矿工，啃穿花岗岩区块并吐出金色哈希",
  "驯服一条区块链巨龙，让它喷火把矿石熔炼成AGENMINER",
  "在火星建造太阳能矿机，把奖励光速传回BNB Chain",
  "向挖矿核心低语一段秘密算法，看AGENMINER晶体慢慢生长",
  "指挥一支像素镐大军跨链行进，把每个区块都挖开",
  "在沙漠中卷起哈希龙卷风，收集留下的代币尘埃",
  "教一群蜜蜂为智能合约授粉，收获蜂蜜般香甜的代币",
  "与机器鲨鱼潜入流动性海底，钻取代币珍珠",
  "把BNB反应堆超频到极限，让AGENMINER火花飞进我的余额",
  "雇佣机械雪怪，从加密冰山中挖出冻结的代币",
  "在区块链花园里播下哈希种子，用新鲜区块浇灌",
  "发射卫星扫描银河，寻找无人认领的AGENMINER小行星",
  "向AI神谕请教今日最幸运的哈希，抢先把它挖走",
  "骑着火箭钻头穿过花岗岩、Gas与黄金区块三层",
  "唤醒沉睡的火山，直接从岩浆中开采熔融代币",
  "把机甲镐组装成巨型机器人，一拳把区块打成钻石",
  "用量子筛过滤星尘，收集剩下的AGENMINER",
  "向内存池哥布林发起挖矿比赛，赢走它们的宝藏",
  "给我的镐充上闪电，一击劈开下一个区块",
  "经营赛博农场，让机器牛从BNB牧场挤出流动性",
  "探索废弃的数据矿洞，营救2017年遗失的代币",
  "让时间静止一秒钟，合法地挖出无穷个区块！",
  "烤一个2100万支蜡烛的区块蛋糕，切下我的AGENMINER一块",
  "召唤中本聪之灵，为我的镐附上传说级挖矿之力",
  "把键盘改造成钻机，一路打字穿透坚硬的岩床",
  "驾驶数据潜艇穿行链上管道，吸走所有代币尘埃",
  "把采矿激光调到最大功率，从陨石上刻下AGENMINER",
  "打开通往代币次元的传送门，让宝石雨落进钱包",
  "聘请企鹅工程师，造一把永不过热的冰钻",
];

const PROMPT_EXAMPLES_EN: string[] = [
  "Mine a fresh block with quantum AI speed from the heart of the BNB Chain galaxy!",
  "Dive deep into the mempool and harvest golden transactions pending since 2021",
  "Ignite the neural network reactor to crystallize gas hashes into AGENMINER",
  "Train 10,000 AI agents to mine crypto umbrellas across BNB cumulus clouds",
  "Extract liquidity from the Polygon black hole using a liquid plasma drill",
  "Fire up diamond GPUs and dig legendary smart contracts from frozen blockchain",
  "Send a robot drilling team to the Moon and scoop moonrock tokens into my wallet",
  "Deploy 999 nano miners to chew through granite blocks and spit out golden hashes",
  "Tame a blockchain dragon and make it breathe fire that melts ore into AGENMINER",
  "Build a solar-powered mining rig on Mars and beam the rewards back to BNB Chain",
  "Whisper a secret algorithm to the mining core and watch AGENMINER crystals grow",
  "March an army of pixel pickaxes across the chain and crack open every block",
  "Spin a tornado of hash power through the desert and collect the token dust",
  "Teach a swarm of bees to pollinate smart contracts and harvest honey-sweet tokens",
  "Dive with robot sharks to the liquidity seabed and drill for token pearls",
  "Overclock the BNB reactor until sparks of pure AGENMINER fly into my balance",
  "Hire a cyborg Yeti to dig frozen tokens out of the crypto iceberg",
  "Plant hashing seeds in the blockchain garden and water them with fresh blocks",
  "Launch a satellite that scans the galaxy for unclaimed AGENMINER asteroids",
  "Ask the AI oracle for the luckiest hash of the day and mine it before anyone else",
  "Ride a rocket-powered drill through granite, gas, and golden block layers",
  "Wake up the sleeping volcano and mine molten tokens straight from the lava",
  "Assemble mecha pickaxes into a giant robot that punches blocks into diamonds",
  "Filter stardust through a quantum sieve and collect the remaining AGENMINER",
  "Challenge the mempool goblins to a digging contest and take their treasure",
  "Charge my pickaxe with lightning and split the next block with one strike",
  "Run a cyber-farm where robot cows milk liquidity from the BNB pasture",
  "Explore the abandoned data mines and rescue lost tokens from 2017",
  "Freeze time for one second and mine an infinite amount of blocks — legally!",
  "Bake a block cake with 21 million candles and slice out my AGENMINER piece",
  "Summon the ghost of Satoshi to bless my pickaxe with legendary mining power",
  "Convert my keyboard into a drill rig and type my way through solid bedrock",
  "Pilot a data submarine through the chain's pipes and vacuum up token dust",
  "Boost my mining laser to maximum and carve AGENMINER out of a meteor",
  "Open a portal to the token dimension and let the gems rain into my wallet",
  "Hire penguin engineers to build an ice drill that never overheats",
];

export function randomExamples(count = 3, lang: "zh" | "en" = "zh"): string[] {
  const pool = lang === "en" ? PROMPT_EXAMPLES_EN : PROMPT_EXAMPLES_ZH;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
