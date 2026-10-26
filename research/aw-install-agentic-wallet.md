# Install Agentic Wallet

Two steps to start operating on-chain through natural language with your AI Agent.

---

## Prerequisites

**Node.js 18+** — required by the Skills installer.

**Binance Account & MPC Wallet**

1. You need a Binance account to get started
2. After signing in to Binance, create an MPC Wallet in the Binance App — this is required before
   you can create an Agentic Wallet

---

## Step 1: Install Skills

```bash
npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet
```

> If the `baw` CLI is not installed, Skills will detect this and install it automatically on first
> use.

---

## Step 2: Sign In

Once installed, say this to your AI Agent:

> "Sign in to Binance Agentic Wallet"

The Agent will return a signin link. If you click this link on mobile, you will be directly
redirected to the Binance App. If you open it on the web, you will need to scan the QR code in the
page using the Binance App and confirm the signin in the App.

If this is your first time signing in, the Binance App will walk you through the Agentic Wallet
creation process. Once complete, you'll land on the Agentic Wallet management page.

To sign out, tell your AI:

> "Sign out"

---

## Security Recommendations

Security rules can only be configured in the Binance App — the AI can read them but cannot modify
them. For first-time setup, we recommend:

- Set a small daily limit (e.g., $50) to start
- Restrict tradable tokens to the Limited scope
- Set high-risk transaction handling to "Require App confirmation"

To modify: **Binance App → Agentic Wallet management page → Settings icon (top right)**

---

## Next Steps

→ [Use Cases Overview](../use-cases/overview.md)
