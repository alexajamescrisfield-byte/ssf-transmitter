import { randomBytes, randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { getOrCreateSigningKey } from "../../lib/keys";

// Throwaway tenant + signing key for a single test, isolated by a unique
// slug so parallel test runs never collide. Always clean up via
// cleanupTenant() in an afterEach/afterAll -- these write real rows to the
// same Postgres database provision-tenant.ts uses.
export async function createTestTenant(prefix = "test") {
  const slug = `${prefix}-${randomUUID().slice(0, 8)}`;
  const apiToken = randomBytes(24).toString("hex");
  const tenant = await prisma.tenant.create({
    data: { slug, name: `Integration test tenant (${slug})`, apiToken },
  });
  await getOrCreateSigningKey(tenant.id);
  return prisma.tenant.findUniqueOrThrow({
    where: { id: tenant.id },
    include: { signingKey: true },
  });
}

export async function cleanupTenant(tenantId: string) {
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.stream.deleteMany({ where: { tenantId } });

  // getOrCreateSigningKey() (lib/keys.ts) stores the private key in Supabase
  // Vault, not this table -- delete the vault.secrets row too, or every test
  // run leaks an orphaned secret.
  const signingKey = await prisma.signingKey.findUnique({ where: { tenantId } });
  if (signingKey?.privateKeySecretId) {
    await prisma.$queryRaw`delete from vault.secrets where id = ${signingKey.privateKeySecretId}::uuid`;
  }
  await prisma.signingKey.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

export function authHeaders(apiToken: string) {
  return { authorization: `Bearer ${apiToken}` };
}
