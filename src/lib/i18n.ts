// ============================================
// AGENTIC MINER — i18n (Bahasa Indonesia ⇄ English)
// Store bahasa dipersist di localStorage (key: agenminer-lang)
// ============================================

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "id" | "en";

const ID = {
  // ── Login screen ──
  loginTagline: "Tambang token dengan Prompt AI di {chain} • Ticker {sym}",
  invitedWith: "Diundang dengan kode",
  totalSupply: "Total Suplai",
  network: "Jaringan",
  miningPool: "Pool Mining",
  remaining: "{n} tersisa",
  loading: "memuat...",
  featMining: "Mining AI",
  featReferral: "Referral",
  featLeaderboard: "Leaderboard",
  signInWallet: "Masuk dengan Binance Agentic Wallet",
  loginFooter:
    "Koneksi aman via wallet Web3 kamu di BNB Smart Chain. Reward ditambang dengan prompt AI — cooldown {s} detik per sesi tambang.",
  // ── Header ──
  balance: "Saldo {sym}",
  dailyStreak: "Streak harian",
  powerMult: "Mining Power multiplier",
  // ── Nav ──
  navMine: "Mine",
  navBoost: "Boost",
  navFriends: "Teman",
  navRank: "Rank",
  navWallet: "Wallet",
  // ── Mine tab ──
  coolingRig: "mendinginkan rig...",
  mineBtn: "TAMBANG",
  viaPromptAI: "via Prompt AI",
  streakDays: "Streak {n} hari (+{p}%)",
  perMine: "~{n} {sym} / tambang",
  miningPrompt: "Prompt Penambangan",
  randomIdeas: "Ide acak",
  promptPlaceholder:
    "Tulis perintah kreatif untuk rig AI kamu... contoh: 'Bor lubang hitam di mempool dan hisap hash emas ke dompet saya'",
  charCount: "{n}/{max} karakter — makin kreatif, makin besar reward!",
  aiMining: "AI sedang menambang...",
  readyIn: "Siap dalam {n}s",
  startMining: "MULAI MENAMBANG {sym}",
  howItWorks: "Cara Kerja Mining AI",
  how1: "Tulis prompt penambangan yang kreatif — semakin imajinatif semakin tinggi skor AI.",
  how2: "Agentic AI mengevaluasi prompt (0–100) dan mengkristalkan {sym} dari pool.",
  how3: "Reward = (25 + skor×0.6) × Power × Bonus Streak — langsung masuk saldo game.",
  how4: "Naikkan Power di tab Boost & tarik {sym} ke wallet BNB Chain kamu.",
  // ── Mine errors ──
  errPromptShort: "Prompt minimal {n} karakter — tulis ide tambang yang kreatif!",
  errPromptLong: "Prompt maksimal {n} karakter.",
  errCooldown: "Rig masih mendinginkan — tunggu {n} detik lagi.",
  errDuplicate: "Prompt ini sudah kamu pakai baru-baru ini. Coba ide baru yang lebih kreatif!",
  errPoolEmpty: "Pool mining sudah habis! Terima kasih sudah menjadi bagian dari AGENTIC MINER.",
  errMineFail: "Gagal menambang, coba lagi.",
  // ── Reward modal ──
  miningResult: "Hasil Penambangan {sym}",
  minedToBalance: "Berhasil ditambang ke saldo game kamu",
  aiScore: "Skor Kreativitas AI",
  keepMining: "Lanjut Menambang",
  // ── Boost tab ──
  boostDesc: "Setiap level melipatgandakan reward tambang",
  level: "Level {n}",
  upgradeTo: "Upgrade ke x{n}",
  cost: "Biaya: {c} {sym}",
  upgrade: "Upgrade",
  needMoreUpgrade: "Kurang {n} {sym} — tambang lagi untuk mengumpulkan!",
  dailyCheckin: "Check-in Harian",
  checkinDesc: "Bonus {n} × Power × Streak setiap hari + jaga streak tetap hidup",
  checkinNow: "Check-in Sekarang",
  checkedIn: "Sudah check-in hari ini",
  tokenomics: "Tokenomics {sym}",
  fixedSupplyNote: "Total suplai tetap {n} token — tanpa inflasi",
  tmPool: "Pool Mining",
  tmTeam: "Tim & Treasury",
  tmMarketing: "Marketing",
  tmLiquidity: "Likuiditas DEX",
  okUpgrade: "⚡ Mining Power naik ke Lv.{lv}!",
  okCheckin: "🎁 Check-in hari {streak}: +{n} {sym}!",
  errUpgrade: "Gagal upgrade.",
  errCheckin: "Gagal check-in.",
  errInsufficient: "Saldo kurang. Butuh {n} {sym} untuk upgrade.",
  errAlreadyCheckin: "Kamu sudah check-in hari ini. Kembali besok!",
  // ── Friends tab ──
  minerTeam: "Tim Penambang",
  inviteDesc: "Ajak teman, panen komisi otomatis",
  totalCommission: "Total Komisi",
  inviteCode: "Kode Undangan",
  shareTitle: "Bagikan Tautan Undangan",
  copied: "Tersalin!",
  copyCode: "Salin Kode: {code}",
  share: "Bagikan",
  shareText:
    "⛏️ Yuk tambang {sym} (AGENTIC MINER) di BNB Chain pakai Prompt AI! Pakai kode undanganku {code} dan dapatkan bonus awal. {link}",
  howReferral: "Cara Kerja Referral",
  ref1Title: "Bagikan kode / tautan",
  ref1Desc: "Kirim kode undangan atau tautan ke teman, grup Telegram, dan medsos kamu.",
  ref2Title: "Bonus langsung untukmu",
  ref2Desc: "Saat teman masuk dengan kodemu, kamu langsung dapat bonus {n} {sym}.",
  ref3Title: "Komisi 5% selamanya",
  ref3Desc: "Kamu menerima {p}% dari setiap reward tambang temanmu — otomatis masuk saldo.",
  // ── Rank tab ──
  yourRank: "Peringkat Kamu",
  totalMined: "Total Ditambang",
  top50: "50 Penambang Teratas",
  refresh: "Segarkan",
  loadingRank: "Memuat peringkat...",
  emptyRank: "Belum ada penambang. Jadilah yang pertama menambang {sym}!",
  you: "kamu",
  // ── Wallet tab ──
  statBalance: "Saldo",
  statMined: "Total Tambang",
  statRef: "Komisi Ref",
  withdrawTitle: "Tarik ke Wallet {chain}",
  noMinNote:
    "Tanpa minimal penarikan — tarik berapa pun! Reward dikirim sebagai token BEP-20 ke alamat {addr} setelah diproses tim distribusi.",
  noMinBadge: "TANPA MINIMAL",
  amountPlaceholder: "Jumlah penarikan",
  withdrawBtn: "Tarik",
  withdrawZero: "Saldo kamu masih 0 — mulai menambang untuk menarik reward!",
  okWithdraw: "Permintaan penarikan {n} {sym} dikirim. Akan diproses ke wallet BNB Chain kamu.",
  errWithdraw: "Gagal menarik.",
  errInsufficientBal: "Saldo tidak cukup.",
  tokenInfo: "Info Token {sym}",
  lblName: "Nama",
  lblStandard: "Standar",
  lblSupply: "Suplai Tetap",
  lblContract: "Kontrak",
  comingSoon: "SEGERA DIUMUMKAN",
  contractPending:
    "Kontrak BEP-20 sedang dalam proses deploy mainnet. Penarikan kamu otomatis diproses segera setelah kontrak aktif — saldo game tetap aman.",
  withdrawHistory: "Riwayat Penarikan",
  wPending: "DIPROSES",
  wSent: "TERKIRIM",
  wRejected: "DITOLAK",
  lastMines: "10 Sesi Tambang Terakhir",
  emptyMines: "Belum ada sesi tambang. Mulai dari tab Mine!",
  score: "Skor {n}/100",
  logout: "Keluar dari {addr}",
  // ── Wallet connect modal ──
  connectTitle: "Hubungkan Binance Agentic Wallet",
  scanning: "Memindai wallet di browser kamu...",
  noWallet:
    "Tidak ada wallet Web3 terdeteksi. Install Binance Web3 Wallet (ekstensi browser / di dalam aplikasi Binance), atau gunakan Mode Demo di bawah untuk mencoba game.",
  recommended: "REKOMENDED",
  walletDetected: "Wallet Web3 terdeteksi",
  errUserRejected: "Koneksi dibatalkan di wallet",
  errConnect: "Gagal terhubung ke wallet",
  errLogin: "Gagal masuk.",
  demoMode: "Mode Demo (Alamat Manual)",
  demoDesc: "Masuk dengan menempelkan alamat wallet BNB kamu",
  demoNote: "Untuk testing cepat tanpa ekstensi wallet. Gunakan alamat BNB Chain kamu.",
  errAddrFormat: "Format alamat tidak valid. Contoh: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  signIn: "Masuk",
  cancel: "Batal",
  connectFooter:
    "Dengan masuk, kamu setuju bahwa mining reward disimpan sebagai saldo game di jaringan BNB Chain dan dapat ditarik ke wallet setelah diproses tim distribusi.",
  // ── Countries ──
  countriesTitle: "Negara Pengguna Kripto Terbanyak",
  countriesSub: "Komunitas kripto global terbesar berdasarkan jumlah pengguna",
  cryptoUsers: "pengguna kripto",
  ofPopulation: "dari populasi",
  sourceNote: "Sumber: Triple-A & Chainalysis Global Adoption 2024 (estimasi)",
  minersCount: "{n} penambang",
};

const EN: Record<keyof typeof ID, string> = {
  // ── Login screen ──
  loginTagline: "Mine tokens with Prompt AI on {chain} • Ticker {sym}",
  invitedWith: "Invited with code",
  totalSupply: "Total Supply",
  network: "Network",
  miningPool: "Mining Pool",
  remaining: "{n} remaining",
  loading: "loading...",
  featMining: "AI Mining",
  featReferral: "Referral",
  featLeaderboard: "Leaderboard",
  signInWallet: "Sign in with Binance Agentic Wallet",
  loginFooter:
    "Secure connection via your Web3 wallet on BNB Smart Chain. Rewards are mined with AI prompts — {s}s cooldown per mining session.",
  // ── Header ──
  balance: "{sym} Balance",
  dailyStreak: "Daily streak",
  powerMult: "Mining Power multiplier",
  // ── Nav ──
  navMine: "Mine",
  navBoost: "Boost",
  navFriends: "Friends",
  navRank: "Rank",
  navWallet: "Wallet",
  // ── Mine tab ──
  coolingRig: "cooling rig...",
  mineBtn: "MINE",
  viaPromptAI: "via AI Prompt",
  streakDays: "Streak {n} days (+{p}%)",
  perMine: "~{n} {sym} / mine",
  miningPrompt: "Mining Prompt",
  randomIdeas: "Random ideas",
  promptPlaceholder:
    "Write a creative command for your AI rig... e.g. 'Drill a black hole in the mempool and suck golden hashes into my wallet'",
  charCount: "{n}/{max} characters — the more creative, the bigger the reward!",
  aiMining: "AI is mining...",
  readyIn: "Ready in {n}s",
  startMining: "START MINING {sym}",
  howItWorks: "How AI Mining Works",
  how1: "Write a creative mining prompt — the more imaginative, the higher your AI score.",
  how2: "Agentic AI evaluates your prompt (0–100) and crystallizes {sym} from the pool.",
  how3: "Reward = (25 + score×0.6) × Power × Streak Bonus — goes straight to your game balance.",
  how4: "Boost your Power in the Boost tab & withdraw {sym} to your BNB Chain wallet.",
  // ── Mine errors ──
  errPromptShort: "Prompt must be at least {n} characters — write a creative mining idea!",
  errPromptLong: "Prompt must be at most {n} characters.",
  errCooldown: "Rig is still cooling — wait {n} more seconds.",
  errDuplicate: "You used this prompt recently. Try a fresh, more creative idea!",
  errPoolEmpty: "The mining pool is depleted! Thank you for being part of AGENTIC MINER.",
  errMineFail: "Mining failed, please try again.",
  // ── Reward modal ──
  miningResult: "{sym} Mining Result",
  minedToBalance: "Mined successfully to your game balance",
  aiScore: "AI Creativity Score",
  keepMining: "Keep Mining",
  // ── Boost tab ──
  boostDesc: "Every level multiplies your mining rewards",
  level: "Level {n}",
  upgradeTo: "Upgrade to x{n}",
  cost: "Cost: {c} {sym}",
  upgrade: "Upgrade",
  needMoreUpgrade: "Need {n} more {sym} — keep mining to collect!",
  dailyCheckin: "Daily Check-in",
  checkinDesc: "Bonus {n} × Power × Streak every day + keep your streak alive",
  checkinNow: "Check In Now",
  checkedIn: "Already checked in today",
  tokenomics: "Tokenomics {sym}",
  fixedSupplyNote: "Fixed total supply of {n} tokens — no inflation",
  tmPool: "Mining Pool",
  tmTeam: "Team & Treasury",
  tmMarketing: "Marketing",
  tmLiquidity: "DEX Liquidity",
  okUpgrade: "⚡ Mining Power up to Lv.{lv}!",
  okCheckin: "🎁 Check-in day {streak}: +{n} {sym}!",
  errUpgrade: "Upgrade failed.",
  errCheckin: "Check-in failed.",
  errInsufficient: "Insufficient balance. You need {n} {sym} to upgrade.",
  errAlreadyCheckin: "You already checked in today. Come back tomorrow!",
  // ── Friends tab ──
  minerTeam: "Miner Team",
  inviteDesc: "Invite friends, earn commission automatically",
  totalCommission: "Total Commission",
  inviteCode: "Invite Code",
  shareTitle: "Share Invite Link",
  copied: "Copied!",
  copyCode: "Copy Code: {code}",
  share: "Share",
  shareText:
    "⛏️ Mine {sym} (AGENTIC MINER) on BNB Chain with AI Prompts! Use my invite code {code} for a starter bonus. {link}",
  howReferral: "How Referrals Work",
  ref1Title: "Share code / link",
  ref1Desc: "Send your invite code or link to friends, Telegram groups, and social media.",
  ref2Title: "Instant join bonus",
  ref2Desc: "When a friend joins with your code, you instantly get a {n} {sym} bonus.",
  ref3Title: "5% commission forever",
  ref3Desc: "You receive {p}% of every mining reward your friends earn — automatically added to your balance.",
  // ── Rank tab ──
  yourRank: "Your Rank",
  totalMined: "Total Mined",
  top50: "Top 50 Miners",
  refresh: "Refresh",
  loadingRank: "Loading rankings...",
  emptyRank: "No miners yet. Be the first to mine {sym}!",
  you: "you",
  // ── Wallet tab ──
  statBalance: "Balance",
  statMined: "Total Mined",
  statRef: "Ref Commission",
  withdrawTitle: "Withdraw to {chain} Wallet",
  noMinNote:
    "No minimum withdrawal — withdraw any amount! Rewards are sent as BEP-20 tokens to {addr} once processed by the distribution team.",
  noMinBadge: "NO MINIMUM",
  amountPlaceholder: "Withdrawal amount",
  withdrawBtn: "Withdraw",
  withdrawZero: "Your balance is still 0 — start mining to withdraw rewards!",
  okWithdraw: "Withdrawal request of {n} {sym} submitted. It will be processed to your BNB Chain wallet.",
  errWithdraw: "Withdrawal failed.",
  errInsufficientBal: "Insufficient balance.",
  tokenInfo: "{sym} Token Info",
  lblName: "Name",
  lblStandard: "Standard",
  lblSupply: "Fixed Supply",
  lblContract: "Contract",
  comingSoon: "COMING SOON",
  contractPending:
    "The BEP-20 contract is being deployed to mainnet. Your withdrawals are processed automatically as soon as the contract goes live — your game balance stays safe.",
  withdrawHistory: "Withdrawal History",
  wPending: "PENDING",
  wSent: "SENT",
  wRejected: "REJECTED",
  lastMines: "Last 10 Mining Sessions",
  emptyMines: "No mining sessions yet. Start from the Mine tab!",
  score: "Score {n}/100",
  logout: "Log out of {addr}",
  // ── Wallet connect modal ──
  connectTitle: "Connect Binance Agentic Wallet",
  scanning: "Scanning for wallets in your browser...",
  noWallet:
    "No Web3 wallet detected. Install Binance Web3 Wallet (browser extension / inside the Binance app), or use Demo Mode below to try the game.",
  recommended: "RECOMMENDED",
  walletDetected: "Web3 wallet detected",
  errUserRejected: "Connection canceled in wallet",
  errConnect: "Failed to connect wallet",
  errLogin: "Sign-in failed.",
  demoMode: "Demo Mode (Manual Address)",
  demoDesc: "Sign in by pasting your BNB wallet address",
  demoNote: "For quick testing without a wallet extension. Use your BNB Chain address.",
  errAddrFormat: "Invalid address format. Example: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  signIn: "Sign In",
  cancel: "Cancel",
  connectFooter:
    "By signing in, you agree that mining rewards are stored as game balance on BNB Chain and can be withdrawn to your wallet after processing by the distribution team.",
  // ── Countries ──
  countriesTitle: "Countries with the Most Crypto Users",
  countriesSub: "The largest global crypto communities by number of users",
  cryptoUsers: "crypto users",
  ofPopulation: "of population",
  sourceNote: "Source: Triple-A & Chainalysis Global Adoption 2024 (estimates)",
  minersCount: "{n} miners",
};

export type TKey = keyof typeof ID;

const DICTS: Record<Lang, Record<TKey, string>> = { id: ID, en: EN };

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "id",
      setLang: (lang) => set({ lang }),
    }),
    { name: "agenminer-lang" }
  )
);

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = DICTS[lang][key] ?? DICTS.id[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/** Hook utama: const { t, lang, setLang } = useT(); */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const t = (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { t, lang, setLang };
}
