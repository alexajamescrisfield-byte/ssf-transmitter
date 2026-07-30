"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/tenants", label: "Tenants" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        borderBottom: "1px solid oklch(0.88 0.01 70)",
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "oklch(0.5 0.16 40)" : "oklch(0.45 0.01 70)",
              borderBottom: active ? "2px solid oklch(0.58 0.16 40)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
