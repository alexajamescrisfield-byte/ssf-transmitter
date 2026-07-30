import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { getOrCreateSigningKey } from "./keys";
import { ssfConfigurationDocument } from "./ssf";

// GUI wrapper around exactly what scripts/provision-tenant.ts already does
// (validated by real, live use this whole project -- not new logic). Same
// slug/apiToken/signing-key shape, just reachable from the Admin > Tenants
// page instead of a CLI command.

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  streamCount: number;
  hasActiveStream: boolean;
}

export async function listTenantsWithStatus(): Promise<TenantSummary[]> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    include: { streams: { select: { status: true } } },
  });

  return tenants.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    createdAt: t.createdAt,
    streamCount: t.streams.length,
    hasActiveStream: t.streams.some((s) => s.status === "enabled"),
  }));
}

export class InvalidTenantInputError extends Error {}

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export interface CreateTenantResult {
  slug: string;
  name: string;
  apiToken: string;
  discoveryUrl: string;
}

export async function createTenant(slugInput: string, nameInput: string): Promise<CreateTenantResult> {
  const slug = slugInput.trim().toLowerCase();
  const name = nameInput.trim() || slug;

  if (!slug) {
    throw new InvalidTenantInputError("Tenant slug is required");
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new InvalidTenantInputError(
      "Slug must be lowercase letters, numbers, and hyphens only (e.g. acme-poc)",
    );
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new InvalidTenantInputError(`Tenant "${slug}" already exists`);
  }

  const apiToken = randomBytes(24).toString("hex");
  const tenant = await prisma.tenant.create({ data: { slug, name, apiToken } });
  await getOrCreateSigningKey(tenant.id);

  const discoveryUrl = `${ssfConfigurationDocument(tenant.slug).issuer}/.well-known/ssf-configuration`;

  return { slug: tenant.slug, name: tenant.name, apiToken: tenant.apiToken, discoveryUrl };
}
