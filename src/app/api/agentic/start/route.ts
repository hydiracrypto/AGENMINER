// POST /api/agentic/start — mulai sign-in Binance Agentic Wallet (pola ptah.trade)
// Server menjalankan `baw auth signin` resmi → QR uni-qr + pairing code ASLI.
// QR DIGENERASI SERVER-SIDE (data URL) → tampil instan di client tanpa render
// canvas di browser (mode HP/proxy lambat pun tetap muncul).
// Bila sesi server masih hidup (ALREADY_CONNECTED) → langsung login tanpa QR.
// Terbuka untuk semua wallet (tanpa gate NFT / whitelist).
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { startAgenticSignIn } from "@/lib/agentic-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  try {
    const body = await req.json().catch(() => ({}));
    const refCode = String(body?.refCode ?? "").trim().toUpperCase() || null;
    const r = await startAgenticSignIn(refCode);

    if (r.kind === "error") {
      console.error(`[agentic/start] ${new Date().toISOString()} UA="${ua}" ERROR: ${r.message}`);
      return NextResponse.json({ error: r.message }, { status: 502 });
    }
    if (r.kind === "already") {
      console.log(
        `[agentic/start] ${new Date().toISOString()} UA="${ua}" ALREADY_CONNECTED ${r.address}`
      );
      return NextResponse.json({ alreadyConnected: true, user: r.user, address: r.address });
    }

    const s = r.session;
    // QR PNG (data URL) digenerasi di server — client tinggal <img src=...>
    let qrDataUrl: string | undefined;
    try {
      qrDataUrl = await QRCode.toDataURL(s.urlForWeb, {
        width: 460,
        margin: 1,
        color: { dark: "#0B0E11", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
    } catch {
      // Gagal generate di server → client memakai fallback render lokal.
      qrDataUrl = undefined;
    }
    console.log(
      `[agentic/start] ${new Date().toISOString()} UA="${ua}" QR ${s.qrCodeId.slice(0, 8)} pairing=${s.pairingCode} reuse=${r.reused ? "yes" : "new"}`
    );
    return NextResponse.json({
      qrCodeId: s.qrCodeId,
      urlForWeb: s.urlForWeb,
      pairingCode: s.pairingCode,
      expireAt: s.expireAt,
      secondsLeft: Math.max(0, Math.floor((s.expireAt - Date.now()) / 1000)),
      ...(qrDataUrl ? { qrDataUrl } : {}),
    });
  } catch (err) {
    console.error(`[agentic/start] ${new Date().toISOString()} UA="${ua}" SERVER_ERROR`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET bridge — proxy/jaringan yang memblokir POST tetap bisa mulai sign-in via ?refCode= */
export async function GET(req: NextRequest) {
  const body: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    body[k] = v;
  });
  return POST(
    new NextRequest(new URL(req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", "user-agent": req.headers.get("user-agent") ?? "" },
      body: JSON.stringify(body),
    })
  );
}
