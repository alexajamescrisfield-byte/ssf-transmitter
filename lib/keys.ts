import { randomUUID } from "crypto";
import { exportJWK, exportPKCS8, generateKeyPair, importPKCS8 } from "jose";
import { prisma } from "./prisma";

// Phase 0: private key lives in SQLite as PEM text. Before any real
// deployment this must move into a managed vault (e.g. Supabase Vault) --
// see prisma/schema.prisma SigningKey model comment.
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

  return prisma.signingKey.create({
    data: {
      tenantId,
      kid,
      privateKeyPem,
      publicKeyJwk: JSON.stringify(publicJwk),
    },
  });
}

export async function importSigningPrivateKey(privateKeyPem: string) {
  return importPKCS8(privateKeyPem, "RS256", { extractable: true });
}
