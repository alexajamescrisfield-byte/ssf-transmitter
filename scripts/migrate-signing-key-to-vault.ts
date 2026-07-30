// One-time: moves every SigningKey row's plaintext privateKeyPem into
// Supabase Vault, writing the returned secret id back to
// privateKeySecretId. Idempotent -- skips rows that already have a
// privateKeySecretId. Does NOT clear privateKeyPem (kept as a rollback
// safety net until lib/keys.ts/lib/ssf.ts are switched over and verified
// with a real signed send -- see HANDOFF_RUNBOOK.md's Vault migration plan).
import { prisma } from "../lib/prisma";
import { storeSecret } from "../lib/vault";

async function main() {
  const keys = await prisma.signingKey.findMany({ where: { privateKeySecretId: null } });
  console.log(`${keys.length} signing key(s) to migrate`);

  for (const key of keys) {
    if (!key.privateKeyPem) {
      console.log(`  skipping ${key.id} -- no privateKeyPem to migrate`);
      continue;
    }
    const secretId = await storeSecret(
      key.privateKeyPem,
      `signing-key-${key.tenantId}`,
      `RS256 signing key private key for SigningKey ${key.id} (tenant ${key.tenantId})`,
    );
    await prisma.signingKey.update({
      where: { id: key.id },
      data: { privateKeySecretId: secretId },
    });
    console.log(`  migrated ${key.id} -> vault secret ${secretId}`);
  }

  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
