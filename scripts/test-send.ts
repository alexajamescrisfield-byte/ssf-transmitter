// Throwaway smoke test for sendSsfSignal() against the local mock receiver.
// Usage: npx tsx scripts/test-send.ts <streamId>
import { sendSsfSignal } from "../lib/ssf";
import { prisma } from "../lib/prisma";

async function main() {
  const streamId = process.argv[2];
  if (!streamId) {
    console.error("Usage: npx tsx scripts/test-send.ts <streamId>");
    process.exit(1);
  }

  const result = await sendSsfSignal({
    tenantSlug: "acme-demo",
    streamId,
    event: {
      type: "risk-level-change",
      subjectEmail: "jdoe@acme-demo.example.com",
      claims: { current_level: "high", previous_level: "low" },
      vendorContext: { vendor: "CrowdStrike", detection: "host_suspected_breach" },
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
