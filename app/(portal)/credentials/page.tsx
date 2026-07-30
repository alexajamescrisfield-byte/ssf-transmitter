import { prisma } from "@/lib/prisma";
import { ssfConfigurationDocument } from "@/lib/ssf";
import { getSelectedTenantSlug } from "@/lib/tenant";
import CredentialsPanel from "@/components/CredentialsPanel";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  const tenantSlug = await getSelectedTenantSlug();
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

  if (!tenant) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Credentials</h1>
        <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)" }}>
          No tenant provisioned yet. Create one in <strong>Admin → Tenants</strong> first.
        </p>
      </div>
    );
  }

  const discoveryUrl = `${ssfConfigurationDocument(tenant.slug).issuer}/.well-known/ssf-configuration`;

  return <CredentialsPanel discoveryUrl={discoveryUrl} apiToken={tenant.apiToken} />;
}
