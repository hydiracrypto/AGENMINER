// Patch i18n.ts: ganti blok key modal lama dengan set key baru (ZH & EN)
// + update label tombol login-screen (signInWallet).
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "/home/z/my-project/src/lib/i18n.ts";
let src = readFileSync(FILE, "utf8");

const ZH_BLOCK = `  // ── Agent Wallet modal (ala ptah.trade — CLI resmi Binance) ──
  agentWalletTitle: "Agent Wallet",
  notConnected: "未连接",
  connectStatus: "连接中",
  connected: "已连接",
  qrSubtitle: "连接 Binance Agent Wallet，在此查看你的资产并审核交易。",
  signInAgentic: "登录我的 Agentic Wallet",
  startingSignIn: "正在建立安全连接…",
  agentIdNote: "登录需要验证钱包持有 Agentic ID NFT；登录后生成你的专属游戏 Agent ID，即用户名和邀请码",
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
  agentIdGate: "进入条件：钱包必须持有 Agentic ID NFT（SPACE ID Agent ID，BNB Chain 主网，合约 ",
  agentIdGateEnd: "）。没有该 NFT 的钱包将被拒绝进入。",
  agentIdRequired: "此钱包未持有 Agentic ID NFT（SPACE ID Agent ID，BNB Chain 主网）——拒绝进入。请先用 Binance Agentic Wallet 领取 .ai Agent ID，再用该钱包登录。",
  sdkFailed: "无法连接币安网络，请重试",
  noWallet: "未检测到 Web3 钱包。请在 Binance App 内置浏览器打开本站，或安装 Binance Web3 Wallet 浏览器扩展。",
  walletDetected: "已检测到 Web3 钱包",
  errUserRejected: "在钱包中取消了连接",
  errConnect: "连接钱包失败",
  errLogin: "登录失败。",
  qrFooter:
    "扫码即表示你同意：挖矿奖励以游戏余额形式记录，提现时自动铸造为 BEP-20 代币到你的 BNB Chain 钱包，手续费注入 PancakeSwap 流动性。本站为游戏演示，与 Binance 官方无关。",
`;

const EN_BLOCK = `  // ── Agent Wallet modal (ptah.trade style — official Binance CLI) ──
  agentWalletTitle: "Agent Wallet",
  notConnected: "Not connected",
  connectStatus: "Connecting",
  connected: "Connected",
  qrSubtitle: "Connect Binance Agent Wallet to see your assets and review transactions here.",
  signInAgentic: "Sign in to my Agentic Wallet",
  startingSignIn: "Starting secure sign-in…",
  agentIdNote: "Sign-in verifies that your wallet holds the Agentic ID NFT; after signing in, your unique in-game Agent ID becomes your username and invite code",
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
  agentIdGate: "Entry requirement: your wallet must hold the Agentic ID NFT (SPACE ID Agent ID, BNB Chain mainnet, contract ",
  agentIdGateEnd: "). Wallets without this NFT are denied entry.",
  agentIdRequired: "This wallet does not hold the Agentic ID NFT (SPACE ID Agent ID on BNB Chain mainnet) — entry denied. Claim a .ai Agent ID in the Binance Agentic Wallet first, then sign in with that wallet.",
  sdkFailed: "Couldn't reach the Binance network — please retry",
  noWallet: "No Web3 wallet detected. Open this site in the Binance App's built-in browser, or install the Binance Web3 Wallet browser extension.",
  walletDetected: "Web3 wallet detected",
  errUserRejected: "Connection canceled in wallet",
  errConnect: "Failed to connect wallet",
  errLogin: "Sign-in failed.",
  qrFooter:
    "By scanning, you agree that mining rewards are recorded as game balance; withdrawals are auto-minted as BEP-20 tokens to your BNB Chain wallet, with the fee added to PancakeSwap liquidity. This is a demo game — not affiliated with Binance.",
`;

const START = "  // ── Wallet connect modal ──";
const END = "  // ── Countries ──";

function replaceBlock(text, startMarker, endMarker, replacement) {
  const s = text.indexOf(startMarker);
  if (s === -1) throw new Error("start marker not found");
  const e = text.indexOf(endMarker, s);
  if (e === -1) throw new Error("end marker not found");
  return text.slice(0, s) + replacement + text.slice(e);
}

// Blok ZH (pertama) lalu EN (berikutnya)
src = replaceBlock(src, START, END, ZH_BLOCK + "\n");
src = replaceBlock(src, START, END, EN_BLOCK + "\n");

// Label tombol login
src = src.replace(
  'signInWallet: "使用 Binance Agentic Wallet 登录",',
  'signInWallet: "登录我的 Agentic Wallet",'
);
src = src.replace(
  'signInWallet: "Sign in with Binance Agentic Wallet",',
  'signInWallet: "Sign in to my Agentic Wallet",'
);

writeFileSync(FILE, src);
console.log("i18n patched OK");
