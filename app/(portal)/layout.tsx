import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalShell from "@/components/PortalShell";
import { TENANT_SLUG } from "@/lib/tenant";

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

  return (
    <PortalShell tenantSlug={TENANT_SLUG} userEmail={user.email ?? ""}>
      {children}
    </PortalShell>
  );
}
