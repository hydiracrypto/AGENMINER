// Cek referral bonus di database
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const referrer = await db.user.findFirst({ where: { agentId: "TitanPulse43" } });
const newest = await db.user.findFirst({ orderBy: { createdAt: "desc" } });
console.log("REFERRER:", JSON.stringify({ agentId: referrer?.agentId, refCode: referrer?.refCode, balance: referrer?.balance, refEarnings: referrer?.refEarnings }));
console.log("NEW USER:", JSON.stringify({ agentId: newest?.agentId, refCode: newest?.refCode, referredById: newest?.referredById, address: newest?.walletAddress }));
await db.$disconnect();
