// DIAGNOSTIK RUNTIME — GET /api/diag
// Verifikasi cepat kondisi deployment tanpa log akses:
// - runtime server (node/bun) & versinya
// - dukungan createECDH("secp256k1") native (akar masalah agenminer: Bun tak dukung)
// - smoke test CLI baw (`wallet status --json`, read-only) + sumber launcher
// TIDAK membocorkan path sensitif/isi env — hanya label & status boolean.
import { NextResponse } from "next/server";
import { createECDH } from "node:crypto";
import { fetchBawSmoke } from "@/lib/baw-diag";

export const dynamic = "force-dynamic";

export async function GET() {
  const versions = process.versions as Record<string, string | undefined>;
  const runtime = versions.bun ? "bun" : "node";

  let nativeSecp256k1: "ok" | "failed" = "ok";
  try {
    createECDH("secp256k1").generateKeys();
  } catch {
    nativeSecp256k1 = "failed"; // diharapkan "failed" di bawah Bun
  }

  const baw = await fetchBawSmoke();

  return NextResponse.json(
    {
      ok: true,
      time: new Date().toISOString(),
      runtime,
      versions: { node: versions.node ?? null, bun: versions.bun ?? null },
      crypto: {
        nativeSecp256k1,
        note: "CLI baw ter-patch polyfill JS — tetap jalan walau native gagal",
      },
      baw,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
