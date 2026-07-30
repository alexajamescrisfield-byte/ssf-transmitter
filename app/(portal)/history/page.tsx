import { prisma } from "@/lib/prisma";
import { listVendorScenarios } from "@/lib/vendorScenarios";
import { TENANT_SLUG } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const COLUMNS = "1.3fr 1fr 1.6fr 1.8fr 0.8fr 0.9fr";

export default async function HistoryPage() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  const [logs, scenarios] = await Promise.all([
    tenant
      ? prisma.auditLog.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    listVendorScenarios(),
  ]);

  const rows = logs.map((log) => {
    const scenario = log.scenarioKey ? scenarios[log.scenarioKey] : undefined;
    return {
      id: log.id,
      timeDisplay: log.createdAt.toLocaleString(),
      vendorName: scenario?.vendor ?? "—",
      eventName: scenario?.displayName ?? log.eventType,
      subjectEmail: log.subject,
      statusCode: log.httpStatus ?? "—",
      resultLabel: log.success ? "Success" : "Failed",
      resultColor: log.success ? "oklch(0.5 0.14 150)" : "oklch(0.55 0.18 25)",
    };
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0" }}>History</h1>
      <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)", margin: "0 0 24px 0" }}>
        Every signal send attempt, most recent first.
      </p>
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
            gridTemplateColumns: COLUMNS,
            gap: 8,
            padding: "12px 20px",
            background: "oklch(0.95 0.01 70)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "oklch(0.45 0.01 70)",
          }}
        >
          <div>TIMESTAMP</div>
          <div>VENDOR</div>
          <div>EVENT</div>
          <div>SUBJECT</div>
          <div>STATUS</div>
          <div>RESULT</div>
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS,
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
            <div>{row.vendorName}</div>
            <div>{row.eventName}</div>
            <div style={{ color: "oklch(0.45 0.01 70)" }}>{row.subjectEmail}</div>
            <div style={{ fontFamily: "'SF Mono', Consolas, monospace" }}>{row.statusCode}</div>
            <div style={{ fontWeight: 700, color: row.resultColor }}>{row.resultLabel}</div>
          </div>
        ))}

        {rows.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "oklch(0.55 0.01 70)", fontSize: 13 }}>
            No signals sent yet. Send one from the Simulator page.
          </div>
        )}
      </div>
    </div>
  );
}
