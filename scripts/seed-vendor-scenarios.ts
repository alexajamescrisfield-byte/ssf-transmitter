// One-time: migrates the old static lib/catalog.ts VENDOR_SCENARIOS map into
// the new VendorScenario Postgres table (see prisma/schema.prisma). Preserves
// the exact original keys (e.g. "crowdstrike-host-isolated") since existing
// AuditLog.scenarioKey rows reference them and the History page's lookup
// depends on the key staying stable. Idempotent -- upserts by key, safe to
// re-run.
import type { Prisma } from "../app/generated/prisma/client";
import { prisma } from "../lib/prisma";
import { VENDOR_SCENARIOS } from "../lib/catalog";

async function main() {
  let created = 0;
  let updated = 0;

  for (const [key, scenario] of Object.entries(VENDOR_SCENARIOS)) {
    const data = {
      vendor: scenario.vendor,
      displayName: scenario.displayName,
      triggerCode: scenario.triggerCode,
      caepType: scenario.event.type,
      claims: scenario.event.claims as Prisma.InputJsonValue,
      vendorEventType: scenario.event.vendorEventType ?? null,
      recommendedAction: scenario.event.recommendedAction ?? null,
      reasonAdmin: scenario.event.reasonAdmin ?? null,
      reasonUser: scenario.event.reasonUser ?? null,
    };

    const existing = await prisma.vendorScenario.findUnique({ where: { key } });
    await prisma.vendorScenario.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });
    if (existing) updated++;
    else created++;
  }

  console.log(`Seeded VendorScenario table: ${created} created, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
