# ⛏️ AGENMINER — Agentic AI Mining dApp

Mine AGENMINER tokens by writing creative prompts — an agentic AI scores them and crystallizes rewards from the pool. Built with a **Binance Agentic Wallet (BAW)** sign-in flow, referral system, and BEP-20 withdrawal pipeline on **BNB Smart Chain**.

> ⚠️ **Disclaimer**: This is an experimental demo project. Mining rewards are recorded as an in-game balance. Withdrawals mint BEP-20 tokens on BNB Chain and inject fees into PancakeSwap liquidity. Nothing here is financial advice — use at your own risk.

---

## ✨ Features

- **Agentic Wallet Sign-in** — passwordless login by scanning a QR code with the Binance App (official `@binance/agentic-wallet` CLI under the hood). Username & invite code automatically follow the owner's real **Binance Agent ID** (e.g. `everhand.ai`).
- **AI Prompt Mining** — write a creative prompt every 60s; the AI scores it and mines AGENMINER from the pool.
- **Referral System** — invite friends with your Agent ID as the invite code; earn an instant join bonus + 5% lifetime commission on their mining rewards.
- **Leaderboard** — live Top 100 miners ranked by total mined.
- **Boost** — speed up your mining rate.
- **BEP-20 Withdrawal** — mint tokens to your BNB Chain wallet with automatic PancakeSwap liquidity injection.
- **i18n** — English / 中文 UI.

## 🛠️ Tech Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Framework | Next.js 16 (App Router, standalone build) · React · TypeScript |
| Styling   | Tailwind CSS 4 · shadcn/ui                                   |
| Database  | SQLite via Prisma ORM                                        |
| Wallet    | `@binance/agentic-wallet` CLI (vendored) · EIP-6963 injected providers |
| Runtime   | Node.js or Bun                                               |

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install        # or: npm install

# 2. Generate Prisma client + push schema
bunx prisma generate
bunx prisma db push

# 3. Configure environment
echo 'DATABASE_URL=file:/absolute/path/to/db/custom.db' > .env

# 4. Run the dev server
bun run dev        # http://localhost:3000
```

### Production

```bash
bunx next build
# standalone server (works under Node or Bun):
node .next/standalone/server.js    # or: bun .next/standalone/server.js
```

## 🔐 The secp256k1 polyfill (important!)

Bun's `crypto.createECDH("secp256k1")` is not supported and throws
`Failed to create key using named curve` — which breaks the BAW pairing/QR
flow when the standalone server runs under Bun. This repo therefore ships:

- `vendor/node_modules/@binance/agentic-wallet/` — the BAW CLI, self-contained,
  with `dist/index.js` patched to import a **pure-JS secp256k1 ECDH
  implementation** (`dist/ecdh-secp256k1.mjs`, BigInt, tested against OpenSSL
  vectors).
- A launcher (`src/lib/agentic-wallet.ts`) that prefers a **Node binary** for
  the CLI when the server itself runs under Bun, falling back to
  `process.execPath` + the polyfill.

To re-apply the patch after upgrading the vendored package:

```bash
bun scripts/patch-baw-ecdh.mjs      # idempotent
bun scripts/test-ecdh-polyfill.mjs  # crypto vectors + OpenSSL interop
```

`GET /api/diag` reports the live deployment status: server runtime, native
secp256k1 support, launcher source, and a BAW CLI smoke test.

## 🗺️ API Map

| Endpoint                  | Method      | Description                                  |
| ------------------------- | ----------- | -------------------------------------------- |
| `/api/wallet/start`       | POST/GET    | Start Agentic Wallet sign-in (QR + pairing)  |
| `/api/wallet/poll`        | GET         | Poll pairing status                          |
| `/api/wallet/signout`     | DELETE      | Clear server-side wallet session             |
| `/api/auth/login`         | POST/GET    | Regular EVM wallet login                     |
| `/api/mine`               | POST        | Submit mining prompt                         |
| `/api/boost`              | POST        | Activate boost                               |
| `/api/leaderboard`        | GET         | Top 100 miners                               |
| `/api/stats`              | GET         | Global stats                                 |
| `/api/user/[address]`     | GET         | User profile                                 |
| `/api/withdraw`           | POST        | BEP-20 withdrawal                            |
| `/api/diag`               | GET         | Runtime & CLI diagnostics                    |

(`​/api/agentic/*` aliases are kept for compatibility.)

## 📁 Structure

```
src/
  app/api/...           # API routes (wallet, mine, leaderboard, diag, ...)
  components/game/...   # Mine / Boost / Friends / Rank / Wallet tabs
  lib/
    agentic-wallet.ts   # BAW CLI launcher + sign-in session manager
    ecdh polyfill       # see vendor/.../dist/ecdh-secp256k1.mjs
    create-user.ts      # registration, Agent ID & invite code sync
    i18n.ts             # EN / zh-CN strings
vendor/                 # vendored @binance/agentic-wallet (patched)
scripts/                # patch & maintenance utilities
db/                     # SQLite database
```

## 📄 License

MIT — see [LICENSE](LICENSE).
