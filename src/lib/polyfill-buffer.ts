// ============================================
// Polyfill browser untuk SDK resmi Binance (@binance/w3w-*)
// SDK memakai global Buffer & process (pola Web3 klasik) yang
// tidak tersedia di browser — Next.js/Turbopack tidak mem-polyfill.
// Import file ini SEBELUM dynamic import SDK.
// ============================================

import { Buffer } from "buffer";

declare global {
  interface Window {
    Buffer?: typeof Buffer;
    global?: unknown;
  }
}

const g = globalThis as unknown as Record<string, unknown>;

if (typeof window !== "undefined") {
  if (typeof window.Buffer === "undefined") window.Buffer = Buffer;
  if (typeof window.global === "undefined") window.global = window;
  if (typeof g.Buffer === "undefined") g.Buffer = Buffer;
  if (typeof g.process === "undefined") {
    g.process = { env: {}, browser: true, version: "", versions: {} };
  }
}

export {};
