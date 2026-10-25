// GET /api/pair/status?code=xxxxxx — dipolling modal Agent Wallet
// Return: WAITING | APPROVED (+ user) | EXPIRED
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toPublicUser } from "@/lib/user-utils";

const CODE_RE = /^[0-9a-f]{6}$/;

export async function GET(req: NextRequest) {
  try {
    const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: "Invalid pairing code" }, { status: 400 });
    }

    const session = await db.pairSession.findUnique({ where: { code } });
    if (!session) {
      return NextResponse.json({ status: "NOT_FOUND" });
    }
    if (session.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ status: "EXPIRED" });
    }
    if (session.status === "APPROVED" && session.address) {
      const user = await db.user.findUnique({ where: { walletAddress: session.address } });
      if (user) {
        return NextResponse.json({ status: "APPROVED", user: toPublicUser(user) });
      }
    }
    return NextResponse.json({ status: "WAITING" });
  } catch (err) {
    console.error("[pair/status]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
