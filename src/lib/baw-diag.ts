// Smoke test CLI baw untuk /api/diag — memakai runBaw yang sama persis
// dengan alur sign-in produksi, sehingga hasilnya merepresentasikan
// kondisi launcher + CLI yang sesungguhnya di deployment.
import { runBaw, getBawLauncherSrc } from "./agentic-wallet";

export interface BawSmoke {
  launcher: string; // label pendek sumber resolusi launcher
  cliOk: boolean;
  status: string | null;
  error: string | null;
  ms: number;
}

/** Klasifikasikan sumber launcher menjadi label pendek tanpa path penuh */
function shortSrc(src: string): string {
  if (src === "env:BAW_BIN") return "env:BAW_BIN";
  if (src === "PATH") return "PATH";
  if (src.includes("(node:")) return src.includes("vendor") ? "vendor+node" : "node_modules+node";
  if (src.includes("(bun+polyfill)")) return "vendor+bun-polyfill";
  if (src.includes("vendor")) return "vendor";
  if (src.includes("node_modules")) return "node_modules";
  return src.slice(0, 40);
}

export async function fetchBawSmoke(): Promise<BawSmoke> {
  const t0 = Date.now();
  const res = await runBaw(["wallet", "status", "--json"], 15_000);
  return {
    launcher: shortSrc(getBawLauncherSrc()),
    cliOk: Boolean(res?.success),
    status: (res?.data?.status as string) ?? null,
    error: res?.success ? null : (res?.error?.message ?? "unknown").slice(0, 160),
    ms: Date.now() - t0,
  };
}
