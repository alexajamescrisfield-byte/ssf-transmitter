import { prisma } from "./prisma";

// Validates the bearer token ISC sends against the tenant's stored API
// token (the same value the SE pastes into ISC's Receiver > Authentication
// > API Token field). Returns the tenant row or null.
export async function requireTenantByBearerToken(
  slug: string,
  request: Request,
) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || token !== tenant.apiToken) return null;

  return tenant;
}
