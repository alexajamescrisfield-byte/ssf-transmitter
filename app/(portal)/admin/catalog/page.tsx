import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/AdminNav";
import CatalogManager from "@/components/CatalogManager";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const rows = await prisma.vendorScenario.findMany({
    orderBy: [{ vendor: "asc" }, { displayName: "asc" }],
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0" }}>Vendor Catalog</h1>
      <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)", margin: "0 0 20px 0" }}>
        Vendors and events available in the Simulator. Adding one here makes it available
        immediately — no code change or redeploy needed.
      </p>

      <AdminNav />

      <CatalogManager
        rows={rows.map((r) => ({
          id: r.id,
          key: r.key,
          vendor: r.vendor,
          displayName: r.displayName,
          triggerCode: r.triggerCode,
          caepType: r.caepType,
        }))}
      />
    </div>
  );
}
