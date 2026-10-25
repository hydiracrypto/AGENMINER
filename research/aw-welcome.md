# Binance Agentic Wallet

## What is Binance Agentic Wallet

On-chain operations are getting more complex by the day — limit orders, multi-chain asset
management… every step demands manual action, constant monitoring, and the risk of missing the right
moment.

**Binance Agentic Wallet changes all of that.**

Just tell your AI what you want in plain language. The AI understands your intent, finds the optimal
path, and executes on-chain within the safety rules you define. No contract addresses to memorize.
No parameters to type. No screen to watch.

### Why Binance Agentic Wallet

**MPC Keyless Security** Built on the same MPC Keyless technology as Binance Wallet. Your private
key is never fully reconstructed on any single device or server. The AI Agent cannot directly hold
or transfer your keys. Every operation is logged and auditable on-chain.

**You Set the Rules — the AI Stays Within Them** Set your daily limit, tradable token scope, and
high-risk transaction handling in the Binance App. These rules constrain the Agent at the API level.
Any action outside your rules is automatically rejected or requires a second confirmation from you.

**Natural Language as the Interface** Swap, transfer, place orders, check balances — all through
conversation. Install the Skills and connect to Claude, ChatGPT, Copilot, or any major AI Agent.
Agentic Wallet is ready immediately.

---

## Core Capabilities

| Capability            | Description                                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| **Authentication**    | QR code sign-in, session management, sign-out                                  |
| **Wallet**            | Status, address, balances, transaction history, daily quota, security settings |
| **Market Order**      | Market swap, quote, order tracking                                             |
| **Limit Order**       | Limit buy/sell, order management, cancel                                       |
| **Prediction Market** | Browse markets, place predictions, manage positions, redeem winnings           |

> More features coming soon.

### Security: MPC Keyless

- Private key is never fully reconstructed on any single device or server
- All Agent operations are logged and auditable at any time
- The Agent is constrained at the API level and cannot exceed user-defined rules

### You Define the Rules

- Set daily limits and tradable token scope in the Binance App
- Sign out of Agentic Wallet anytime to revoke the Agent's access
- High-risk transactions can be auto-rejected or sent for App confirmation

---

## Key Use Cases

**Check your assets**

> "What's my wallet address? How much USDT do I have? How much of my daily limit is left?"

**Market swap**

> "Swap 0.1 BNB for USDT" — the AI fetches a quote, confirms with you, then executes.

**Limit order**

> "Buy 100 USDT worth of BNB when the price drops to $500" — the order waits for the trigger
> automatically.

**Token transfer**

> "Send 10 USDT to 0x123" — the AI confirms with you before executing, address has to be in
> addressbook

**Prediction market**

> "Bet 10 USDT on YES for BTC 5-min price up" — the AI shows current odds, confirms your bet, then
> places the prediction.

---

## Install

Run the following command to install Skills. The CLI will be set up automatically:

```bash
npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet
```

See [Install Agentic Wallet](./quickstart/install-agentic-wallet.md) for the full setup guide.

---

## Chain Support

Current version supports 4 major networks, with more chains coming soon.

| Network               | Chain ID | Status         |
| --------------------- | -------- | -------------- |
| BNB Smart Chain (BSC) | 56       | ✅ Supported   |
| Ethereum              | 1        | ✅ Supported   |
| Base                  | 8453     | ✅ Supported   |
| Solana                | CT_501   | ✅ Supported   |
| More networks         | —        | 🔜 Coming Soon |

---

## Documentation

- [Install Agentic Wallet](./quickstart/install-agentic-wallet.md)
- [Use Cases Overview](./use-cases/overview.md)
- [Skills Reference](./reference/skills.md)
