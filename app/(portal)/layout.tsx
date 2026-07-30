import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalShell from "@/components/PortalShell";
import { getSelectedTenantSlug } from "@/lib/tenant";
import { listTenantsWithStatus } from "@/lib/tenants";

// Defense-in-depth: middleware.ts already redirects unauthenticated
// requests before they reach here, but Supabase's own docs recommend also
// checking in the layout via getUser() (not just trusting the cookie),
// since middleware alone can be bypassed in some edge cases (e.g. a
// Server Component fetch that doesn't go through the matcher the same way).
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [tenantSlug, tenants] = await Promise.all([getSelectedTenantSlug(), listTenantsWithStatus()]);

  return (
    <PortalShell tenantSlug={tenantSlug} tenants={tenants} userEmail={user.email ?? ""}>
      {children}
    </PortalShell>
  );
}
