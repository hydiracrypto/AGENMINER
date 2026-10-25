# Minimal Tutorial

## 🎯 Goal

Complete your first end-to-end swap in four steps — the shortest path from "is my wallet working" to
"the swap is on-chain".

## ✅ Prerequisites

- Agentic Wallet [installed](../quickstart/install-agentic-wallet) and signed in.
- A small BNB balance for gas and the swap.

## Walkthrough

The minimal workflow: check status → get a quote → confirm and swap.

**1. Check wallet connection**

> "Is my wallet connected? What's my address?"

The Agent returns your connection status and wallet address.

**2. Check balances**

> "How much BNB and USDT do I have?"

The Agent returns all non-zero balances with USD valuation.

**3. Get a swap quote (no execution)**

> "How much USDT would I get for 0.01 BNB? Don't execute."

The Agent returns the estimated output, slippage, and gas estimate — no on-chain transaction is
triggered.

**4. Execute the swap**

> "Go ahead and execute."

The Agent requests your confirmation, then submits the on-chain swap and returns an order ID for
tracking.

## What's next

- Dive into [Wallet Operations](./basics/wallet-operations) for the full set of status and balance
  queries.
- Learn [Market Order](./trading/market-order) and [Limit Order](./trading/limit-order) trading in
  depth.
