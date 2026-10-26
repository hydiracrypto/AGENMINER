// Backfill: isi agentId untuk user lama + samakan refCode dengan Agent ID
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const AGENT_ADJ = [
  "Swift", "Lucky", "Nova", "Iron", "Gold", "Turbo", "Astro", "Cyber", "Mega", "Ultra",
  "Bright", "Prime", "Quantum", "Stellar", "Rocket", "Thunder", "Diamond", "Solar", "Lunar", "Neo",
  "Alpha", "Delta", "Omega", "Titan", "Vortex", "Pixel", "Crypto", "Meta", "Hyper", "Zen",
];
const AGENT_NOUN = [
  "Miner", "Agent", "Falcon", "Tiger", "Wolf", "Eagle", "Dragon", "Panda", "Lion", "Shark",
  "Rocket", "Comet", "Pulse", "Forge", "Vault", "Ranger", "Hunter", "Pilot", "Rider", "Scout",
  "Byte", "Block", "Chain", "Token", "Hash", "Node", "Core", "Peak", "Wave", "Storm",
];

function generateAgentId(): string {
  const adj = AGENT_ADJ[Math.floor(Math.random() * AGENT_ADJ.length)];
  const noun = AGENT_NOUN[Math.floor(Math.random() * AGENT_NOUN.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

async function main() {
  const users = await db.user.findMany({ where: { agentId: null }, select: { id: true, refCode: true } });
  let ok = 0;
  for (const u of users) {
    for (let i = 0; i < 12; i++) {
      const agentId = generateAgentId();
      try {
        await db.user.update({
          where: { id: u.id },
          data: { agentId, refCode: agentId.toUpperCase() },
        });
        ok++;
        break;
      } catch {
        // bentrok unique → coba kombinasi lain
      }
    }
  }
  console.log(`Backfill selesai: ${ok}/${users.length} user diberi Agent ID`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
