"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Simulator" },
  { href: "/history", label: "History" },
  { href: "/credentials", label: "Credentials" },
];

export default function PortalShell({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh", color: "oklch(0.22 0.01 70)" }}>
      <div
        style={{
          width: 220,
          flex: "none",
          background: "oklch(0.92 0.02 230)",
          borderRight: "1px solid oklch(0.82 0.025 230)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ padding: "0 8px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.01em" }}>
            SSF Injector
          </div>
          <div style={{ fontSize: 11, color: "oklch(0.55 0.01 70)", marginTop: 2 }}>
            {tenantSlug}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  background: active ? "oklch(0.58 0.16 40)" : "transparent",
                  color: active ? "white" : "oklch(0.35 0.01 70)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div
          style={{
            marginTop: "auto",
            padding: 12,
            fontSize: 11,
            color: "oklch(0.55 0.01 70)",
            borderTop: "1px solid oklch(0.9 0.01 70)",
          }}
        >
          Internal demo tool — single tenant
        </div>
      </div>

      <div style={{ flex: 1, padding: "32px 40px", maxWidth: 1400 }}>{children}</div>
    </div>
  );
}
