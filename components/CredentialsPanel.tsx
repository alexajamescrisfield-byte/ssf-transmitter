"use client";

import { useState } from "react";

export default function CredentialsPanel({
  discoveryUrl,
  apiToken,
}: {
  discoveryUrl: string;
  apiToken: string;
}) {
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
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0" }}>Credentials</h1>
      <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)", margin: "0 0 24px 0" }}>
        Read-only. Provisioning a new tenant is still a one-time CLI step.
      </p>

      <div
        style={{
          background: "oklch(0.94 0.03 25)",
          border: "1px solid oklch(0.82 0.05 25)",
          borderRadius: 10,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SailPoint ISC receiver setup</div>
          <div style={{ fontSize: 12.5, color: "oklch(0.45 0.03 25)", lineHeight: 1.5 }}>
            When adding this transmitter as an SSF Receiver in SailPoint ISC (Admin → Connections
            → Shared Signals), paste these two values into the matching fields.
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "oklch(0.5 0.01 70)", marginBottom: 8 }}>
            DISCOVERY URL
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "oklch(0.95 0.01 70)",
                borderRadius: 6,
                fontFamily: "'SF Mono', Consolas, monospace",
                fontSize: 12.5,
                overflowX: "auto",
              }}
            >
              {discoveryUrl}
            </div>
            <button onClick={() => copy(discoveryUrl, "discovery")} style={rowButtonStyle}>
              {copiedField === "discovery" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "oklch(0.5 0.01 70)", marginBottom: 8 }}>
            API TOKEN
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "oklch(0.95 0.01 70)",
                borderRadius: 6,
                fontFamily: "'SF Mono', Consolas, monospace",
                fontSize: 12.5,
                overflowX: "auto",
              }}
            >
              {tokenVisible ? apiToken : "•".repeat(32)}
            </div>
            <button onClick={() => setTokenVisible((v) => !v)} style={rowButtonStyle}>
              {tokenVisible ? "Hide" : "Show"}
            </button>
            <button onClick={() => copy(apiToken, "token")} style={rowButtonStyle}>
              {copiedField === "token" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div
          style={{
            paddingTop: 16,
            borderTop: "1px solid oklch(0.92 0.01 70)",
            fontSize: 12,
            color: "oklch(0.5 0.01 70)",
          }}
        >
          Paste the Discovery URL in ISC under <strong>Admin → Connections → Shared Signals</strong>.
        </div>
      </div>
    </div>
  );
}
