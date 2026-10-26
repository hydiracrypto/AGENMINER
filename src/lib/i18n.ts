// ============================================
// AGENTIC MINER — i18n (中文 ⇄ English)
// Bahasa Indonesia dihapus — hanya Chinese & English
// Store bahasa dipersist di localStorage (key: agenminer-lang)
// ============================================

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "zh" | "en";

export const DEFAULT_LANG: Lang = "zh";

const ZH = {
  // ── Login screen ──
  loginTagline: "在 {chain} 用 AI 提示词挖矿 • 代币 {sym}",
  invitedWith: "邀请码",
  totalSupply: "总供应量",
  network: "网络",
  miningPool: "挖矿池",
  remaining: "剩余 {n}",
  loading: "加载中...",
  featMining: "AI 挖矿",
  featReferral: "推荐奖励",
  featLeaderboard: "排行榜",
  featMiningDesc: "写下有创意的挖矿提示词，Agentic AI 为你评分，并从矿池中直接结晶 AGENMINER。",
  featReferralDesc: "邀请好友立即获得 500 奖励，并终身享受好友挖矿奖励 5% 的佣金。",
  featLeaderboardDesc: "与全球矿工同台竞技，冲击排行榜前列，实时见证矿池进度。",
  signInWallet: "登录我的 Agentic Wallet",
  loginFooter:
    "通过你的 Web3 钱包安全连接 BNB Smart Chain。使用 AI 提示词挖矿 — 每次挖矿冷却 {s} 秒。",
  // ── Header ──
  balance: "{sym} 余额",
  dailyStreak: "连续签到",
  powerMult: "挖矿算力倍数",
  // ── Nav ──
  navMine: "挖矿",
  navBoost: "加速",
  navFriends: "好友",
  navRank: "排名",
  navWallet: "钱包",
  // ── Mine tab ──
  coolingRig: "矿机冷却中...",
  mineBtn: "挖矿",
  viaPromptAI: "通过 AI 提示词",
  streakDays: "连续 {n} 天 (+{p}%)",
  perMine: "约 {n} {sym} / 次",
  miningPrompt: "挖矿提示词",
  randomIdeas: "随机灵感",
  promptPlaceholder:
    "为你的 AI 矿机写一条有创意的指令... 例如：\"在内存池钻出一个黑洞，把金色哈希吸入我的钱包\"",
  charCount: "{n}/{max} 字符 — 越有创意，奖励越大！",
  aiMining: "AI 正在挖矿...",
  readyIn: "{n} 秒后就绪",
  startMining: "开始挖矿 {sym}",
  howItWorks: "AI 挖矿原理",
  how1: "写一条有创意的挖矿提示词 — 想象力越丰富，AI 评分越高。",
  how2: "Agentic AI 评估你的提示词（0–100 分）并从矿池中结晶 {sym}。",
  how3: "奖励 = (25 + 评分×0.6) × 算力 × 连签加成 — 直接进入游戏余额。",
  how4: "在加速页提升算力，并把 {sym} 自动铸造提现到你的 BNB Chain 钱包。",
  poolStatsTitle: "挖矿池统计",
  minedOut: "已挖出",
  remainingLabel: "剩余",
  poolRecycledLabel: "升级燃烧已回流矿池 ♻️",
  // ── Mine errors ──
  errPromptShort: "提示词至少需要 {n} 个字符 — 写一个有创意的挖矿点子！",
  errPromptLong: "提示词最多 {n} 个字符。",
  errCooldown: "矿机还在冷却 — 再等 {n} 秒。",
  errDuplicate: "这条提示词你最近用过了。换一个更新颖的点子吧！",
  errPoolEmpty: "矿池已挖完！感谢参与 AGENTIC MINER。",
  errMineFail: "挖矿失败，请重试。",
  errMiningCap: "已达到钱包挖矿上限 — 每个钱包最多 7,000 AGENMINER。感谢您的参与！",
  capLeft: "剩余可挖 {n} / 7,000",
  noAgentHint: "未验证 Agent ID：冷却 5 分钟、奖励 50% — 连接 Binance Agentic Wallet 即可恢复完整速度",
  // ── Reward modal ──
  miningResult: "{sym} 挖矿结果",
  minedToBalance: "成功挖入你的游戏余额",
  aiScore: "AI 创意评分",
  keepMining: "继续挖矿",
  // ── Boost tab ──
  boostDesc: "每级都会成倍放大挖矿奖励（Lv 1-10）",
  level: "等级 {n}/10",
  upgradeTo: "升级到 x{n}",
  cost: "费用：{c} {sym}",
  upgrade: "升级",
  needMoreUpgrade: "还差 {n} {sym} — 继续挖矿攒够！",
  maxLevelBadge: "满级",
  maxLevelNote: "已达最高等级 Lv.10 — 升级消耗会被销毁，无法提现",
  dailyCheckin: "每日签到",
  checkinDesc: "每天奖励 {n} × 算力 × 连签加成，保持连胜不断",
  checkinNow: "立即签到",
  checkedIn: "今天已签到",
  tokenomics: "{sym} 代币经济",
  fixedSupplyNote: "固定总供应量 {n} 枚 — 永无通胀",
  tmPool: "挖矿池",
  tmTeam: "团队与金库",
  tmMarketing: "市场营销",
  tmLiquidity: "DEX 流动性",
  okUpgrade: "⚡ 挖矿算力升到 Lv.{lv}！",
  okCheckin: "🎁 连签第 {streak} 天：+{n} {sym}！",
  errUpgrade: "升级失败。",
  errMaxLevel: "已达最高等级 Lv.10。",
  errCheckin: "签到失败。",
  errInsufficient: "余额不足。升级需要 {n} {sym}。",
  errAlreadyCheckin: "今天已经签到过了，明天再来！",
  // ── Friends tab ──
  minerTeam: "矿工团队",
  inviteDesc: "邀请好友，自动赚取佣金",
  totalCommission: "累计佣金",
  inviteCode: "邀请码",
  agentIdHint: "你的 Agent ID 就是邀请码，分享给好友赚佣金",
  shareTitle: "分享邀请链接",
  copied: "已复制！",
  copyCode: "复制邀请码：{code}",
  share: "分享",
  shareText:
    "⛏️ 来 BNB Chain 用 AI 提示词挖 {sym}（AGENTIC MINER）！使用我的邀请码 {code} 领取新人奖励。{link}",
  howReferral: "推荐机制说明",
  ref1Title: "分享邀请码 / 链接",
  ref1Desc: "把邀请码或链接发给好友、Telegram 群组和社交媒体。",
  ref2Title: "即时加入奖励",
  ref2Desc: "好友用你的邀请码加入，你立即获得 {n} {sym} 奖励。",
  ref3Title: "终身 5% 佣金",
  ref3Desc: "好友每次挖矿奖励的 {p}% 会自动进入你的余额。",
  // ── Rank tab ──
  yourRank: "我的排名",
  totalMined: "累计挖矿",
  top50: "挖矿前 100 名",
  refresh: "刷新",
  loadingRank: "排名加载中...",
  emptyRank: "还没有矿工。来成为第一个挖 {sym} 的人！",
  you: "我",
  // ── Wallet tab ──
  statBalance: "余额",
  statMined: "累计挖矿",
  statRef: "推荐佣金",
  withdrawTitle: "提现到 {chain} 钱包",
  noMinNote:
    "无最低提现限制 — 想提多少就提多少！提交后立即自动铸造（Mint）BEP-20 代币到 {addr}，手续费自动注入 PancakeSwap 流动性。",
  noMinBadge: "无最低限制",
  autoMintBadge: "自动铸造",
  amountPlaceholder: "提现数量",
  withdrawBtn: "提现",
  withdrawZero: "余额还是 0 — 快去挖矿才能提现！",
  feeLabel: "手续费 {p}% → PancakeSwap 流动性",
  feeAmountLabel: "手续费",
  receiveLabel: "钱包到账",
  okWithdraw:
    "已自动铸造 {n} {sym} 到你的 BNB Chain 钱包 • 手续费 {fee} 已注入 PancakeSwap 流动性",
  errWithdraw: "提现失败。",
  errInsufficientBal: "余额不足。",
  liquidityTitle: "PancakeSwap 流动性",
  liquiditySub: "来自提现手续费的累计注入",
  liquidityEmpty: "暂无注入。提现手续费会自动进入流动池。",
  tokenInfo: "{sym} 代币信息",
  lblName: "名称",
  lblStandard: "标准",
  lblSupply: "固定供应量",
  lblContract: "合约",
  comingSoon: "即将公布",
  contractPending:
    "BEP-20 合约正在部署到 BNB Chain 主网。合约上线后，提现会立即自动铸造（Mint）到你的钱包 — 游戏余额始终安全。",
  withdrawHistory: "提现记录",
  wPending: "处理中",
  wMinted: "已铸造",
  wSent: "已到账",
  wRejected: "已拒绝",
  lastMines: "最近 10 次挖矿",
  emptyMines: "还没有挖矿记录。去挖矿页开始吧！",
  score: "评分 {n}/100",
  logout: "退出 {addr}",
  // ── Agent Wallet modal (ala ptah.trade — CLI resmi Binance) ──
  agentWalletTitle: "Agent Wallet",
  notConnected: "未连接",
  connectStatus: "连接中",
  connected: "已连接",
  qrSubtitle: "连接 Binance Agent Wallet，在此查看你的资产并审核交易。",
  signInAgentic: "登录我的 Agentic Wallet",
  startingSignIn: "正在建立安全连接…",
  agentIdNote: "登录后自动生成你的专属游戏 Agent ID，作为用户名和邀请码",
  orDivider: "或",
  useRegularWallet: "使用普通钱包",
  backToAgent: "返回 Agent Wallet 登录",
  pairingCode: "配对码",
  scanHint: "用 Binance App 扫描二维码，核对配对码一致后确认登录",
  openBinance: "打开 Binance 登录",
  waitingConfirm: "等待确认",
  codeExpired: "配对码已过期",
  refreshCode: "刷新配对码",
  cancelConnect: "取消连接",
  sdkFailed: "无法连接币安网络，请重试",
  errOffline: "网络连接已断开 —— 请检查你的互联网连接后重试",
  errStale: "页面会话已过期或服务已迁移 —— 请刷新页面，或从最新链接重新打开本站再登录",
  retryConnect: "重试",
  noWallet: "未检测到 Web3 钱包。请在 Binance App 内置浏览器打开本站，或安装 Binance Web3 Wallet 浏览器扩展。",
  walletDetected: "已检测到 Web3 钱包",
  errUserRejected: "在钱包中取消了连接",
  errConnect: "连接钱包失败",
  errLogin: "登录失败。",
  qrFooter:
    "扫码即表示你同意：挖矿奖励以游戏余额形式记录，提现时自动铸造为 BEP-20 代币到你的 BNB Chain 钱包，手续费由 Agentic Miner 注入 PancakeSwap 流动性。",

  // ── Countries ──
  countriesTitle: "加密用户最多的国家",
  countriesSub: "按用户数量统计的全球最大加密社区",
  cryptoUsers: "加密用户",
  ofPopulation: "占总人口",
  minersCount: "{n} 位矿工",
};

const EN: Record<keyof typeof ZH, string> = {
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
  featMiningDesc: "Write a creative mining prompt — agentic AI scores it and crystallizes AGENMINER from the pool.",
  featReferralDesc: "Earn 500 instantly per friend invited plus a 5% lifetime commission on their mining rewards.",
  featLeaderboardDesc: "Compete with miners worldwide, climb the Top 100 and watch the pool progress live.",
  signInWallet: "Sign in to my Agentic Wallet",
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
  how4: "Boost your Power in the Boost tab & auto-mint withdraw {sym} to your BNB Chain wallet.",
  poolStatsTitle: "Mining Pool Stats",
  minedOut: "Mined",
  remainingLabel: "Remaining",
  poolRecycledLabel: "Upgrade burn recycled to pool ♻️",
  // ── Mine errors ──
  errPromptShort: "Prompt must be at least {n} characters — write a creative mining idea!",
  errPromptLong: "Prompt must be at most {n} characters.",
  errCooldown: "Rig is still cooling — wait {n} more seconds.",
  errDuplicate: "You used this prompt recently. Try a fresh, more creative idea!",
  errPoolEmpty: "The mining pool is depleted! Thank you for being part of AGENTIC MINER.",
  errMineFail: "Mining failed, please try again.",
  errMiningCap: "Wallet mining cap reached — max 7,000 AGENMINER per wallet. Thank you for mining!",
  capLeft: "{n} / 7,000 left to mine",
  noAgentHint: "No verified Agent ID: 5-min cooldown & 50% rewards — connect your Binance Agentic Wallet to mine at full speed",
  // ── Reward modal ──
  miningResult: "{sym} Mining Result",
  minedToBalance: "Mined successfully to your game balance",
  aiScore: "AI Creativity Score",
  keepMining: "Keep Mining",
  // ── Boost tab ──
  boostDesc: "Every level multiplies your mining rewards (Lv 1-10)",
  level: "Level {n}/10",
  upgradeTo: "Upgrade to x{n}",
  cost: "Cost: {c} {sym}",
  upgrade: "Upgrade",
  needMoreUpgrade: "Need {n} more {sym} — keep mining to collect!",
  maxLevelBadge: "MAX",
  maxLevelNote: "Max level reached (Lv.10) — upgrade costs are burned and cannot be withdrawn",
  dailyCheckin: "Daily Check-in",
  checkinDesc: "Bonus {n} × Power × Streak every day + keep your streak alive",
  checkinNow: "Check In Now",
  checkedIn: "Already checked in today",
  tokenomics: "{sym} Tokenomics",
  fixedSupplyNote: "Fixed total supply of {n} tokens — no inflation",
  tmPool: "Mining Pool",
  tmTeam: "Team & Treasury",
  tmMarketing: "Marketing",
  tmLiquidity: "DEX Liquidity",
  okUpgrade: "⚡ Mining Power up to Lv.{lv}!",
  okCheckin: "🎁 Check-in day {streak}: +{n} {sym}!",
  errUpgrade: "Upgrade failed.",
  errMaxLevel: "Max level reached (Lv.10).",
  errCheckin: "Check-in failed.",
  errInsufficient: "Insufficient balance. You need {n} {sym} to upgrade.",
  errAlreadyCheckin: "You already checked in today. Come back tomorrow!",
  // ── Friends tab ──
  minerTeam: "Miner Team",
  inviteDesc: "Invite friends, earn commission automatically",
  totalCommission: "Total Commission",
  inviteCode: "Invite Code",
  agentIdHint: "Your Agent ID is your invite code — share it to earn commission",
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
  top50: "Top 100 Miners",
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
    "No minimum withdrawal — withdraw any amount! Tokens are instantly auto-minted as BEP-20 to {addr}, with the fee automatically added to PancakeSwap liquidity.",
  noMinBadge: "NO MINIMUM",
  autoMintBadge: "AUTO MINT",
  amountPlaceholder: "Withdrawal amount",
  withdrawBtn: "Withdraw",
  withdrawZero: "Your balance is still 0 — start mining to withdraw rewards!",
  feeLabel: "Fee {p}% → PancakeSwap liquidity",
  feeAmountLabel: "Fee",
  receiveLabel: "To wallet",
  okWithdraw:
    "Auto-minted {n} {sym} to your BNB Chain wallet • Fee {fee} added to PancakeSwap liquidity",
  errWithdraw: "Withdrawal failed.",
  errInsufficientBal: "Insufficient balance.",
  liquidityTitle: "PancakeSwap Liquidity",
  liquiditySub: "Accumulated from withdrawal fees",
  liquidityEmpty: "Nothing yet. Withdrawal fees flow into the pool automatically.",
  tokenInfo: "{sym} Token Info",
  lblName: "Name",
  lblStandard: "Standard",
  lblSupply: "Fixed Supply",
  lblContract: "Contract",
  comingSoon: "COMING SOON",
  contractPending:
    "The BEP-20 contract is being deployed to BNB Chain mainnet. Once live, withdrawals are instantly auto-minted to your wallet — your game balance stays safe.",
  withdrawHistory: "Withdrawal History",
  wPending: "PENDING",
  wMinted: "MINTED",
  wSent: "SENT",
  wRejected: "REJECTED",
  lastMines: "Last 10 Mining Sessions",
  emptyMines: "No mining sessions yet. Start from the Mine tab!",
  score: "Score {n}/100",
  logout: "Log out of {addr}",
  // ── Agent Wallet modal (ptah.trade style — official Binance CLI) ──
  agentWalletTitle: "Agent Wallet",
  notConnected: "Not connected",
  connectStatus: "Connecting",
  connected: "Connected",
  qrSubtitle: "Connect Binance Agent Wallet to see your assets and review transactions here.",
  signInAgentic: "Sign in to my Agentic Wallet",
  startingSignIn: "Starting secure sign-in…",
  agentIdNote: "After sign-in, your unique in-game Agent ID is generated automatically — it becomes your username and invite code",
  orDivider: "or",
  useRegularWallet: "Use a regular wallet",
  backToAgent: "Back to Agent Wallet sign-in",
  pairingCode: "Pairing code",
  scanHint: "Scan the QR with the Binance App, make sure the pairing code matches, then confirm sign-in",
  openBinance: "Open Binance sign-in",
  waitingConfirm: "Waiting for confirmation",
  codeExpired: "Pairing code expired",
  refreshCode: "Refresh code",
  cancelConnect: "Cancel connection",
  sdkFailed: "Couldn't reach the Binance network — please retry",
  errOffline: "No internet connection — check your network and try again",
  errStale: "This page session is stale or the server has moved — refresh the page or reopen the site via the latest link, then sign in again",
  retryConnect: "Retry",
  noWallet: "No Web3 wallet detected. Open this site in the Binance App's built-in browser, or install the Binance Web3 Wallet browser extension.",
  walletDetected: "Web3 wallet detected",
  errUserRejected: "Connection canceled in wallet",
  errConnect: "Failed to connect wallet",
  errLogin: "Sign-in failed.",
  qrFooter:
    "By scanning, you agree that mining rewards are recorded as game balance; withdrawals are auto-minted as BEP-20 tokens to your BNB Chain wallet, with the fee added to PancakeSwap liquidity by agentic miner",

  // ── Countries ──
  countriesTitle: "Countries with the Most Crypto Users",
  countriesSub: "The largest global crypto communities by number of users",
  cryptoUsers: "crypto users",
  ofPopulation: "of population",
  minersCount: "{n} miners",
};

export type TKey = keyof typeof ZH;

const DICTS: Record<Lang, Record<TKey, string>> = { zh: ZH, en: EN };

/** Amankan nilai lang dari localStorage lama (mis. "id" sudah dihapus) */
function safeLang(l: unknown): Lang {
  return l === "en" ? "en" : "zh";
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      setLang: (lang) => set({ lang: safeLang(lang) }),
    }),
    {
      name: "agenminer-lang",
      version: 2, // v2: bahasa Indonesia dihapus → hanya zh/en
      migrate: () => ({ lang: DEFAULT_LANG }),
    }
  )
);

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  const safe = safeLang(lang);
  let s: string = DICTS[safe][key] ?? DICTS[DEFAULT_LANG][key] ?? String(key);
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
  return { t, lang: safeLang(lang), setLang };
}
