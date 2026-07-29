// Phase 0 real-signal test: sends an actual risk-level-change SET to a
// real ISC tenant for a real identity.
// Usage: npx tsx --env-file=.env scripts/test-send.ts <streamId>
import { sendSsfSignal } from "../lib/ssf";
import { prisma } from "../lib/prisma";

async function main() {
  const streamId = process.argv[2];
  if (!streamId) {
    console.error("Usage: npx tsx --env-file=.env scripts/test-send.ts <streamId>");
    process.exit(1);
  }

  const result = await sendSsfSignal({
    tenantSlug: "company21912-poc",
    streamId,
    event: {
      type: "risk-level-change",
      subjectEmail: "Jayme.Cannon@sailpointdemo.com",
      // Per the CAEP spec: "Value MUST be one of LOW, MEDIUM, HIGH."
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "CrowdStrike",
      vendorEventType: "host_suspected_breach",
      recommendedAction: "disable_account",
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
