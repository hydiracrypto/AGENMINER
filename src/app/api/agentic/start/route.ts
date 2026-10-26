// POST /api/agentic/start — mulai sign-in Binance Agentic Wallet (pola ptah.trade)
// Server menjalankan `baw auth signin` resmi → QR uni-qr + pairing code ASLI.
// QR DIGENERASI SERVER-SIDE (data URL) → tampil instan di client tanpa render
// canvas di browser (mode HP/proxy lambat pun tetap muncul).
// Bila sesi server masih hidup (ALREADY_CONNECTED) → langsung login tanpa QR.
// force=true (aksi user: klik sign-in/Retry/refresh) → QR & pairing code BARU.
// DELETE → batalkan sesi pending (tombol "Cancel connection").
// SEMUA respons no-store: gateway/proxy dilarang menyajikan respons basi.
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { startAgenticSignIn, clearAgenticSession } from "@/lib/agentic-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  Vary: "*",
};

export async function POST(req: NextRequest) {
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  try {
    const body = await req.json().catch(() => ({}));
    // Catatan: GET bridge mengubah null → string "null" (URLSearchParams) —
    // jangan biarkan jadi refCode "NULL".
    const rawRef = String(body?.refCode ?? "").trim();
    const refCode = rawRef && !/^(null|undefined)$/i.test(rawRef) ? rawRef.toUpperCase() : null;
    const force = body?.force === true || body?.force === "1" || body?.force === "true";
    const r = await startAgenticSignIn(refCode, { force });

    if (r.kind === "error") {
      console.error(`[agentic/start] ${new Date().toISOString()} UA="${ua}" ERROR: ${r.message}`);
      return NextResponse.json({ error: r.message }, { status: 502, headers: NO_STORE });
    }
    if (r.kind === "already") {
      console.log(
        `[agentic/start] ${new Date().toISOString()} UA="${ua}" ALREADY_CONNECTED ${r.address}`
      );
      return NextResponse.json(
        { alreadyConnected: true, user: r.user, address: r.address },
        { headers: NO_STORE }
      );
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
      `[agentic/start] ${new Date().toISOString()} UA="${ua}" QR ${s.qrCodeId.slice(0, 8)} pairing=${s.pairingCode} reuse=${r.reused ? "yes" : "new"}${force ? " force" : ""}`
    );
    return NextResponse.json(
      {
        qrCodeId: s.qrCodeId,
        urlForWeb: s.urlForWeb,
        pairingCode: s.pairingCode,
        expireAt: s.expireAt,
        secondsLeft: Math.max(0, Math.floor((s.expireAt - Date.now()) / 1000)),
        ...(qrDataUrl ? { qrDataUrl } : {}),
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error(`[agentic/start] ${new Date().toISOString()} UA="${ua}" SERVER_ERROR`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: NO_STORE });
  }
}

/** GET bridge — proxy/jaringan yang memblokir POST tetap bisa mulai sign-in via ?refCode=
 *  SELALU non-force (reuse sesi pending) — dipakai rantai retry otomatis klien,
 *  supaya QR yang sedang dilihat user tidak digantikan saat fallback. */
export async function GET(req: NextRequest) {
  const body: Record<string, string> = { force: "0" };
  req.nextUrl.searchParams.forEach((v, k) => {
    if (k !== "force") body[k] = v;
  });
  return POST(
    new NextRequest(new URL(req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", "user-agent": req.headers.get("user-agent") ?? "" },
      body: JSON.stringify(body),
    })
  );
}

/** DELETE — batalkan sesi sign-in pending (tombol "Cancel connection" / tutup modal).
 *  Sesi pending dilenyuhkan → connect berikutnya PASTI menghasilkan QR + pairing BARU. */
export async function DELETE(req: NextRequest) {
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  clearAgenticSession();
  console.log(`[agentic/cancel] ${new Date().toISOString()} UA="${ua}" session cleared`);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
