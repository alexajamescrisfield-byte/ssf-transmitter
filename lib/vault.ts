import { prisma } from "./prisma";

// Thin wrapper around Supabase Vault (the `supabase_vault` Postgres
// extension, confirmed enabled on this project -- `select extname from
// pg_extension where extname = 'supabase_vault'`). Vault isn't a
// Prisma-managed model -- its tables/views live outside this schema -- so
// this uses parameterized $queryRaw against vault.create_secret() and the
// vault.decrypted_secrets view directly. Confirmed empirically that the
// role behind DATABASE_URL/DIRECT_URL (Supabase's pooler-mapped `postgres`
// role) has grants to both.
//
// Used for signing-key private-key material (lib/keys.ts, lib/ssf.ts) --
// see prisma/schema.prisma's SigningKey model comment for why this
// replaced the old plaintext `privateKeyPem` column.

export async function storeSecret(secret: string, name: string, description: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    select vault.create_secret(${secret}, ${name}, ${description}) as id
  `;
  return rows[0].id;
}

export class SecretNotFoundError extends Error {
  constructor(secretId: string) {
    super(`No Vault secret found for id ${secretId}`);
    this.name = "SecretNotFoundError";
  }
}

export async function readSecret(secretId: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ decrypted_secret: string }[]>`
    select decrypted_secret from vault.decrypted_secrets where id = ${secretId}::uuid
  `;
  if (rows.length === 0) throw new SecretNotFoundError(secretId);
  return rows[0].decrypted_secret;
}
