// Cek user hasil pairing & sesi pair di database
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const user = await db.user.findFirst({ where: { agentId: "OmegaStorm38" } });
const sessions = await db.pairSession.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
console.log("PAIRED-USER:", JSON.stringify({ agentId: user?.agentId, refCode: user?.refCode, address: user?.walletAddress }));
console.log("PAIR-SESSIONS:", JSON.stringify(sessions.map((s) => ({ code: s.code, status: s.status, address: s.address }))));
await db.$disconnect();
