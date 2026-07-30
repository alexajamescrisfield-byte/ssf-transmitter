import { prisma } from "@/lib/prisma";
import { listVendorScenarios } from "@/lib/vendorScenarios";
import { listTenantsWithStatus } from "@/lib/tenants";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

const CARD_STYLE: React.CSSProperties = {
  background: "oklch(0.97 0.008 75)",
  border: "1px solid oklch(0.85 0.02 75)",
  borderRadius: 10,
  padding: "18px 20px",
};

const CARD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "oklch(0.5 0.01 70)",
  marginBottom: 8,
};

const CARD_VALUE_STYLE: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: "oklch(0.22 0.01 70)",
  lineHeight: 1.1,
};

const CARD_SUB_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: "oklch(0.55 0.01 70)",
  marginTop: 6,
};

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export default async function AdminOverviewPage() {
  // Aggregated across ALL tenants -- Overview is a cross-tenant dashboard,
  // unlike Simulator/History/Credentials which operate on one selected
  // tenant. Matches the reference portal's "(all tenants)" framing.
  const [tenants, totalCount, successCount, last24h, last7d, last30d, grouped, recentFailures, scenarios] =
    await Promise.all([
      listTenantsWithStatus(),
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { success: true } }),
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(1) } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: daysAgo(30) } } }),
      prisma.auditLog.groupBy({
        by: ["scenarioKey"],
        where: { scenarioKey: { not: null } },
        _count: { scenarioKey: true },
        orderBy: { _count: { scenarioKey: "desc" } },
        take: 5,
      }),
      prisma.auditLog.findMany({
        where: { success: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { tenant: { select: { slug: true, name: true } } },
      }),
      listVendorScenarios(),
    ]);

  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
  const activeTenantCount = tenants.filter((t) => t.hasActiveStream).length;

  const mostUsed = grouped.map((g) => {
    const scenario = g.scenarioKey ? scenarios[g.scenarioKey] : undefined;
    return {
      key: g.scenarioKey ?? "—",
      label: scenario ? `${scenario.vendor} — ${scenario.displayName}` : (g.scenarioKey ?? "Unknown"),
      count: g._count.scenarioKey,
    };
  });

  const failureRows = recentFailures.map((log) => {
    const scenario = log.scenarioKey ? scenarios[log.scenarioKey] : undefined;
    return {
      id: log.id,
      timeDisplay: log.createdAt.toLocaleString(),
      tenantLabel: log.tenant.name || log.tenant.slug,
      label: scenario ? `${scenario.vendor} — ${scenario.displayName}` : log.eventType,
      response: log.responseBody
        ? `${log.httpStatus ?? "—"} ${log.responseBody.slice(0, 60)}${log.responseBody.length > 60 ? "…" : ""}`
        : String(log.httpStatus ?? "—"),
    };
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0" }}>Overview</h1>
      <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)", margin: "0 0 20px 0" }}>
        Usage and health across all tenants.
      </p>

      <AdminNav />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <div style={CARD_STYLE}>
          <div style={CARD_LABEL_STYLE}>TENANTS</div>
          <div style={CARD_VALUE_STYLE}>{tenants.length}</div>
          <div style={CARD_SUB_STYLE}>
            {activeTenantCount} active, {tenants.length - activeTenantCount} not linked
          </div>
        </div>
        <div style={CARD_STYLE}>
          <div style={CARD_LABEL_STYLE}>SIGNALS SENT</div>
          <div style={CARD_VALUE_STYLE}>{totalCount}</div>
          <div style={CARD_SUB_STYLE}>{successRate}% success (all-time)</div>
        </div>
        <div style={CARD_STYLE}>
          <div style={CARD_LABEL_STYLE}>LAST 24 HOURS</div>
          <div style={CARD_VALUE_STYLE}>{last24h}</div>
          <div style={CARD_SUB_STYLE}>signals sent</div>
        </div>
        <div style={CARD_STYLE}>
          <div style={CARD_LABEL_STYLE}>LAST 7 / 30 DAYS</div>
          <div style={CARD_VALUE_STYLE}>
            {last7d} <span style={{ fontSize: 18, color: "oklch(0.55 0.01 70)" }}>/ {last30d}</span>
          </div>
          <div style={CARD_SUB_STYLE}>signals sent</div>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>Most-used vendor events (all tenants)</h2>
      <div
        style={{
          background: "oklch(0.97 0.008 75)",
          border: "1px solid oklch(0.85 0.02 75)",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: 8,
            padding: "12px 20px",
            background: "oklch(0.95 0.01 70)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "oklch(0.45 0.01 70)",
          }}
        >
          <div>VENDOR / EVENT</div>
          <div>SIGNALS SENT</div>
        </div>
        {mostUsed.map((row) => (
          <div
            key={row.key}
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 1fr",
              gap: 8,
              padding: "14px 20px",
              borderTop: "1px solid oklch(0.92 0.01 70)",
              fontSize: 12.5,
              alignItems: "center",
            }}
          >
            <div>{row.label}</div>
            <div style={{ fontWeight: 700 }}>{row.count}</div>
          </div>
        ))}
        {mostUsed.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "oklch(0.55 0.01 70)", fontSize: 13 }}>
            No signals sent yet.
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px 0" }}>Recent failures (last 10, all tenants)</h2>
      <div
        style={{
          background: "oklch(0.97 0.008 75)",
          border: "1px solid oklch(0.85 0.02 75)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr 1.6fr 1.6fr",
            gap: 8,
            padding: "12px 20px",
            background: "oklch(0.95 0.01 70)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "oklch(0.45 0.01 70)",
          }}
        >
          <div>TIME</div>
          <div>TENANT</div>
          <div>VENDOR / EVENT</div>
          <div>RESPONSE</div>
        </div>
        {failureRows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1.6fr 1.6fr",
              gap: 8,
              padding: "14px 20px",
              borderTop: "1px solid oklch(0.92 0.01 70)",
              fontSize: 12.5,
              alignItems: "center",
            }}
          >
            <div style={{ color: "oklch(0.45 0.01 70)", fontFamily: "'SF Mono', Consolas, monospace" }}>
              {row.timeDisplay}
            </div>
            <div style={{ fontWeight: 600 }}>{row.tenantLabel}</div>
            <div style={{ color: "oklch(0.55 0.15 25)", fontWeight: 600 }}>{row.label}</div>
            <div style={{ fontFamily: "'SF Mono', Consolas, monospace", fontSize: 11.5, color: "oklch(0.45 0.01 70)" }}>
              {row.response}
            </div>
          </div>
        ))}
        {failureRows.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "oklch(0.55 0.01 70)", fontSize: 13 }}>
            No failures recorded.
          </div>
        )}
      </div>
    </div>
  );
}
