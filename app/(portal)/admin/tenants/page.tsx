import { listTenantsWithStatus } from "@/lib/tenants";
import AdminNav from "@/components/AdminNav";
import TenantManager from "@/components/TenantManager";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  const tenants = await listTenantsWithStatus();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0" }}>Tenants</h1>
      <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)", margin: "0 0 20px 0" }}>
        ISC tenants this transmitter can send signals to. Adding one here generates a Discovery
        URL and API token to paste into that tenant&apos;s ISC Receiver setup.
      </p>

      <AdminNav />

      <TenantManager tenants={tenants} />
    </div>
  );
}
