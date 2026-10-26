// ============================================
// Sync username user lama dengan Binance Agent ID asli (CLI baw wallet agent-id)
// Usage: cd /home/z/my-project && bun scripts/sync-agent-id.ts [address] [agentId]
// ============================================
import { registerUser } from "../src/lib/create-user";
import { toPublicUser } from "../src/lib/user-utils";
import { db } from "../src/lib/db";

async function main() {
  const addr = (process.argv[2] ?? "0x9e400222944d864e91bfe54a60becb60c6f5c688")
    .trim()
    .toLowerCase();
  const agentId = (process.argv[3] ?? "everhand.ai").trim().toLowerCase();

  const before = await db.user.findUnique({ where: { walletAddress: addr } });
  console.log("BEFORE:", before ? `${before.username} (agentId=${before.agentId})` : "NOT FOUND");

  const u = await registerUser(addr, null, agentId);
  console.log("AFTER :", JSON.stringify(toPublicUser(u)));

  const all = await db.user.findMany({
    select: { walletAddress: true, username: true, agentId: true },
    take: 20,
    orderBy: { createdAt: "asc" },
  });
  console.log("ALL USERS:");
  for (const r of all) console.log(` - ${r.walletAddress.slice(0, 10)}… → ${r.username ?? "(null)"} / ${r.agentId ?? "-"}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
