// Throwaway diagnostic: dump recent audit log entries to see whether our
// async pushes to ISC's delivery endpoint actually succeeded or failed,
// and how.
import { prisma } from "../lib/prisma";

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  for (const log of logs) {
    console.log("----");
    console.log("time:", log.createdAt.toISOString());
    console.log("eventType:", log.eventType);
    console.log("jti:", log.jti);
    console.log("httpStatus:", log.httpStatus);
    console.log("success:", log.success);
    console.log("responseBody:", log.responseBody?.slice(0, 500));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
