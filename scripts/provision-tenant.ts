// Usage: npx tsx scripts/provision-tenant.ts <slug> <display-name>
//
// Creates a tenant + RS256 signing key. Prints the slug and API token you
// paste into ISC's Receiver setup (Admin > Connection > Shared Signals >
// Create New > Authentication > API Token).
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import { getOrCreateSigningKey } from "../lib/keys";

async function main() {
  const [slug, ...nameParts] = process.argv.slice(2);
  if (!slug) {
    console.error("Usage: npx tsx scripts/provision-tenant.ts <slug> <display-name>");
    process.exit(1);
  }
  const name = nameParts.join(" ") || slug;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.error(`Tenant "${slug}" already exists.`);
    process.exit(1);
  }

  const apiToken = randomBytes(24).toString("hex");
  const tenant = await prisma.tenant.create({ data: { slug, name, apiToken } });
  await getOrCreateSigningKey(tenant.id);

  console.log("Tenant provisioned.");
  console.log(`  slug:       ${tenant.slug}`);
  console.log(`  name:       ${tenant.name}`);
  console.log(`  API token:  ${tenant.apiToken}`);
  console.log("");
  console.log("Paste the API token into ISC's Receiver > Authentication > API Token.");
  console.log(`Discovery URL (once deployed/tunneled): <NEXT_PUBLIC_APP_URL>/t/${tenant.slug}/.well-known/ssf-configuration`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
