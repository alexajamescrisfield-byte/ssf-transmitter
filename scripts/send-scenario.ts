// Send any catalog scenario (lib/catalog.ts) as a real signed SET.
// Usage: npx tsx --env-file=.env scripts/send-scenario.ts <streamId> <scenarioKey> [subjectEmail] [tenantSlug]
import { sendSsfSignal } from "../lib/ssf";
import { prisma } from "../lib/prisma";
import { VENDOR_SCENARIOS } from "../lib/catalog";

async function main() {
  const [streamId, scenarioKey, subjectEmail, tenantSlug] = process.argv.slice(2);

  if (!streamId || !scenarioKey) {
    console.error(
      "Usage: npx tsx --env-file=.env scripts/send-scenario.ts <streamId> <scenarioKey> [subjectEmail] [tenantSlug]",
    );
    console.error("\nAvailable scenarios:");
    for (const [key, s] of Object.entries(VENDOR_SCENARIOS)) {
      console.error(`  ${key.padEnd(30)} ${s.vendor} / ${s.displayName} (${s.event.type})`);
    }
    process.exit(1);
  }

  const scenario = VENDOR_SCENARIOS[scenarioKey];
  if (!scenario) {
    console.error(`Unknown scenario "${scenarioKey}". Run with no args to list available ones.`);
    process.exit(1);
  }

  const result = await sendSsfSignal({
    tenantSlug: tenantSlug ?? "company21912-poc",
    streamId,
    event: {
      ...scenario.event,
      subjectEmail: subjectEmail ?? "Jayme.Cannon@sailpointdemo.com",
    },
  });

  console.log(`Sent: ${scenario.vendor} / ${scenario.displayName} (${scenario.event.type})`);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
