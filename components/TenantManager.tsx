"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantSummary } from "@/lib/tenants";

const SECTION_STYLE: React.CSSProperties = {
  background: "oklch(0.97 0.008 75)",
  border: "1px solid oklch(0.85 0.02 75)",
  borderRadius: 10,
  padding: 22,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid oklch(0.82 0.01 70)",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "oklch(0.4 0.01 70)",
  display: "block",
  marginBottom: 6,
};

interface CreatedTenant {
  slug: string;
  name: string;
  apiToken: string;
  discoveryUrl: string;
}

export default function TenantManager({ tenants }: { tenants: TenantSummary[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedTenant | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<"discovery" | "token" | null>(null);

  async function copy(text: string, field: "discovery" | "token") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API unavailable (e.g. non-HTTPS local dev) -- non-fatal
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create tenant");
        return;
      }
      setCreated(data.tenant);
      setTokenVisible(false);
      setSlug("");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const rowButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    border: "1px solid oklch(0.82 0.01 70)",
    borderRadius: 6,
    background: "white",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start" }}>
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
            gridTemplateColumns: "1.3fr 1.5fr 1fr 1fr",
            gap: 8,
            padding: "12px 20px",
            background: "oklch(0.95 0.01 70)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "oklch(0.45 0.01 70)",
          }}
        >
          <div>SLUG</div>
          <div>NAME</div>
          <div>STREAM</div>
          <div>CREATED</div>
        </div>
        {tenants.map((t) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1.5fr 1fr 1fr",
              gap: 8,
              padding: "12px 20px",
              borderTop: "1px solid oklch(0.92 0.01 70)",
              fontSize: 12.5,
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: "'SF Mono', Consolas, monospace", fontWeight: 600 }}>{t.slug}</div>
            <div>{t.name}</div>
            <div style={{ fontWeight: 700, color: t.hasActiveStream ? "oklch(0.5 0.14 150)" : "oklch(0.55 0.01 70)" }}>
              {t.hasActiveStream ? "Active" : t.streamCount > 0 ? "No active stream" : "Not linked yet"}
            </div>
            <div style={{ color: "oklch(0.5 0.01 70)", fontSize: 11.5 }}>{t.createdAt.toLocaleDateString()}</div>
          </div>
        ))}
        {tenants.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "oklch(0.55 0.01 70)", fontSize: 13 }}>
            No tenants yet.
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <form onSubmit={handleSubmit} style={SECTION_STYLE}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Add tenant</div>

          <div style={{ marginBottom: 12 }}>
            <label style={LABEL_STYLE}>Slug</label>
            <input
              style={{ ...INPUT_STYLE, fontFamily: "'SF Mono', Consolas, monospace" }}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. acme-poc"
              required
            />
            <div style={{ fontSize: 11, color: "oklch(0.55 0.01 70)", marginTop: 6 }}>
              Lowercase letters, numbers, and hyphens only. Used in every discovery/stream URL.
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Display name</label>
            <input
              style={INPUT_STYLE}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp POC"
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: "oklch(0.96 0.03 25)",
                border: "1px solid oklch(0.85 0.06 25)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: 12.5,
                color: "oklch(0.45 0.15 25)",
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: 12,
              border: "none",
              borderRadius: 8,
              background: "oklch(0.58 0.16 40)",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Creating…" : "Create tenant"}
          </button>
        </form>

        {created && (
          <div
            style={{
              background: "oklch(0.94 0.03 25)",
              border: "1px solid oklch(0.82 0.05 25)",
              borderRadius: 10,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                &quot;{created.name}&quot; created
              </div>
              <div style={{ fontSize: 12, color: "oklch(0.45 0.03 25)", lineHeight: 1.5 }}>
                Paste these into this new ISC tenant&apos;s Receiver setup (Admin → Connections →
                Shared Signals) to link it.
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: "oklch(0.5 0.01 70)", marginBottom: 6 }}>
                DISCOVERY URL
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    background: "oklch(0.95 0.01 70)",
                    borderRadius: 6,
                    fontFamily: "'SF Mono', Consolas, monospace",
                    fontSize: 11.5,
                    overflowX: "auto",
                  }}
                >
                  {created.discoveryUrl}
                </div>
                <button onClick={() => copy(created.discoveryUrl, "discovery")} style={rowButtonStyle}>
                  {copiedField === "discovery" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: "oklch(0.5 0.01 70)", marginBottom: 6 }}>
                API TOKEN
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    background: "oklch(0.95 0.01 70)",
                    borderRadius: 6,
                    fontFamily: "'SF Mono', Consolas, monospace",
                    fontSize: 11.5,
                    overflowX: "auto",
                  }}
                >
                  {tokenVisible ? created.apiToken : "•".repeat(32)}
                </div>
                <button onClick={() => setTokenVisible((v) => !v)} style={rowButtonStyle}>
                  {tokenVisible ? "Hide" : "Show"}
                </button>
                <button onClick={() => copy(created.apiToken, "token")} style={rowButtonStyle}>
                  {copiedField === "token" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
