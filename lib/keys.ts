import { randomUUID } from "crypto";
import { exportJWK, exportPKCS8, generateKeyPair, importPKCS8 } from "jose";
import { prisma } from "./prisma";
import { storeSecret } from "./vault";

// New signing keys are stored ONLY in Supabase Vault -- privateKeyPem is
// never written for a key created after this change (see
// prisma/schema.prisma's SigningKey model comment; existing keys were
// backfilled via scripts/migrate-signing-key-to-vault.ts).
export async function getOrCreateSigningKey(tenantId: string) {
  const existing = await prisma.signingKey.findUnique({ where: { tenantId } });
  if (existing) return existing;

  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  const kid = randomUUID();
  const privateKeyPem = await exportPKCS8(privateKey);
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  const privateKeySecretId = await storeSecret(
    privateKeyPem,
    `signing-key-${tenantId}`,
    `RS256 signing key private key for tenant ${tenantId}`,
  );

  return prisma.signingKey.create({
    data: {
      tenantId,
      kid,
      privateKeySecretId,
      publicKeyJwk: JSON.stringify(publicJwk),
    },
  });
}

export async function importSigningPrivateKey(privateKeyPem: string) {
  return importPKCS8(privateKeyPem, "RS256", { extractable: true });
}
