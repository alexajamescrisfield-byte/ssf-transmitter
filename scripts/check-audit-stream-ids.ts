import { prisma } from "../lib/prisma";

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: { eventType: "risk-level-change" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  for (const log of logs) {
    console.log(log.createdAt.toISOString(), log.streamId, log.success, log.httpStatus);
  }
}
main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
