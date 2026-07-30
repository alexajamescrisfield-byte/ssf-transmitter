import { cookies } from "next/headers";
import { prisma } from "./prisma";

// Which tenant Simulator/History/Credentials/the /api/simulate route operate
// on. A single deployed instance can now manage multiple ISC tenants (Admin
// > Tenants) -- the selection is a cookie, not a hardcoded constant, so an
// existing single-tenant deployment behaves identically to before: with
// exactly one tenant, the fallback below always resolves to it.
export const TENANT_COOKIE = "ssf_selected_tenant";

export async function getSelectedTenantSlug(): Promise<string> {
  const store = await cookies();
  const selected = store.get(TENANT_COOKIE)?.value;
  if (selected) {
    const exists = await prisma.tenant.findUnique({ where: { slug: selected }, select: { slug: true } });
    if (exists) return exists.slug;
  }

  // No cookie, or it names a tenant that no longer exists -- fall back to
  // the first tenant ever created. Matches the old hardcoded TENANT_SLUG
  // behavior exactly for any deployment that only has one.
  const first = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" }, select: { slug: true } });
  if (!first) {
    throw new Error("No tenant provisioned yet -- create one in Admin > Tenants first.");
  }
  return first.slug;
}
