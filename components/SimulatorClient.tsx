"use client";

import { useMemo, useState } from "react";
import type { VendorScenario } from "@/lib/vendorScenarios";
import { buildCaepEvent } from "@/lib/caep";
import { CAEP_TYPE_REMEDIATION, sailpointActionFor } from "@/lib/remediation";

const VENDOR_BADGE_DEFAULTS: { initials: string; hue: number }[] = [
  { initials: "", hue: 25 },
  { initials: "", hue: 230 },
  { initials: "", hue: 300 },
  { initials: "", hue: 90 },
  { initials: "", hue: 150 },
  { initials: "", hue: 190 },
  { initials: "", hue: 10 },
];

function badgeFor(vendor: string, index: number) {
  const initials = vendor
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { initials, hue: VENDOR_BADGE_DEFAULTS[index % VENDOR_BADGE_DEFAULTS.length].hue };
}

const SECTION_STYLE: React.CSSProperties = {
  background: "oklch(0.97 0.008 75)",
  border: "1px solid oklch(0.85 0.02 75)",
  borderRadius: 10,
  padding: 22,
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "oklch(0.5 0.16 40)",
  margin: "-22px -22px 20px -22px",
  padding: "13px 22px",
  background: "oklch(0.92 0.025 75)",
  borderBottom: "1px solid oklch(0.85 0.02 75)",
  borderRadius: "10px 10px 0 0",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid oklch(0.82 0.01 70)",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

interface SendResult {
  success: boolean;
  httpStatus: number | null;
  jti?: string;
  error?: string;
}

export default function SimulatorClient({
  scenarios,
}: {
  scenarios: Record<string, VendorScenario>;
}) {
  const scenarioEntries = useMemo(() => Object.entries(scenarios), [scenarios]);
  const vendorOrder = useMemo(
    () => Array.from(new Set(scenarioEntries.map(([, s]) => s.vendor))),
    [scenarioEntries],
  );

  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [scenarioKey, setScenarioKey] = useState<string>("");
  const [subjectEmail, setSubjectEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const scenariosForVendor = selectedVendor
    ? scenarioEntries.filter(([, s]) => s.vendor === selectedVendor)
    : scenarioEntries;

  const selected = scenarioKey ? scenarios[scenarioKey] : null;

  const jsonPreview = useMemo(() => {
    if (!selected) return "// pick a vendor, event, and subject email to preview the signal";
    try {
      const events = buildCaepEvent({ ...selected.event, subjectEmail: subjectEmail || "<subject email>" });
      return JSON.stringify(
        {
          sub_id: { format: "email", email: subjectEmail || "<subject email>" },
          events,
          iat: "<generated at send time>",
          jti: "<generated at send time>",
        },
        null,
        2,
      );
    } catch (err) {
      return `// ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [selected, subjectEmail]);

  const sendDisabled = !scenarioKey || !subjectEmail.trim() || sending;

  async function handleSend() {
    if (sendDisabled) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioKey, subjectEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, httpStatus: res.status, error: data.error });
      } else {
        setResult({ success: data.success, httpStatus: data.httpStatus, jti: data.jti });
      }
    } catch (err) {
      setResult({ success: false, httpStatus: null, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px 0" }}>Simulator</h1>
      <p style={{ fontSize: 13, color: "oklch(0.5 0.01 70)", margin: "0 0 28px 0" }}>
        Trigger a signed CAEP security signal against this tenant&apos;s Shared Signals receiver.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 01 Source Alert */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER_STYLE}>01&nbsp;&nbsp;SOURCE ALERT</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.01 70)", marginBottom: 10 }}>
              Vendor
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${vendorOrder.length}, 1fr)`, gap: 10 }}>
              {vendorOrder.map((vendor, i) => {
                const badge = badgeFor(vendor, i);
                const active = selectedVendor === vendor;
                return (
                  <div
                    key={vendor}
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setScenarioKey("");
                      setResult(null);
                    }}
                    style={{
                      border: `1.5px solid ${active ? "oklch(0.6 0.1 230)" : "oklch(0.85 0.02 75)"}`,
                      borderRadius: 8,
                      padding: "14px 10px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        margin: "0 auto 8px auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 700,
                        background: `oklch(0.55 0.14 ${badge.hue})`,
                      }}
                    >
                      {badge.initials}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{vendor}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid oklch(0.9 0.01 70)" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.01 70)", display: "block", marginBottom: 8 }}>
                Event
              </label>
              <select
                value={scenarioKey}
                onChange={(e) => {
                  setScenarioKey(e.target.value);
                  setResult(null);
                }}
                style={{ ...INPUT_STYLE, background: "white" }}
              >
                <option value="">Select an event…</option>
                {scenariosForVendor.map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 02 Subject */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER_STYLE}>02&nbsp;&nbsp;SUBJECT</div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
              Subject (user email)
            </label>
            <input
              type="text"
              placeholder="jdoe@example.com"
              value={subjectEmail}
              onChange={(e) => {
                setSubjectEmail(e.target.value);
                setResult(null);
              }}
              style={INPUT_STYLE}
            />
            <div style={{ fontSize: 11.5, color: "oklch(0.5 0.01 70)", lineHeight: 1.5, marginTop: 8 }}>
              This tenant correlates identities by email attribute.
            </div>
          </div>

          {/* 03 Response */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER_STYLE}>03&nbsp;&nbsp;RESPONSE</div>
            {selected ? (
              <>
                <div style={{ fontSize: 13, color: "oklch(0.45 0.01 70)", marginBottom: 16 }}>
                  CAEP type{" "}
                  <span
                    style={{
                      fontFamily: "'SF Mono', Consolas, monospace",
                      background: "oklch(0.94 0.01 70)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {selected.event.type}
                  </span>{" "}
                  triggers workflow{" "}
                  <strong style={{ color: "oklch(0.22 0.01 70)" }}>
                    {CAEP_TYPE_REMEDIATION[selected.event.type].workflowName}
                  </strong>
                </div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  SailPoint action
                </label>
                <div
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid oklch(0.82 0.01 70)",
                    borderRadius: 6,
                    fontSize: 13,
                    background: "oklch(0.95 0.01 70)",
                    color: "oklch(0.35 0.01 70)",
                    boxSizing: "border-box",
                  }}
                >
                  {sailpointActionFor(scenarioKey, selected.event.type)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "oklch(0.5 0.01 70)" }}>
                Pick a vendor and event above to see what this will trigger.
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
          <div style={{ background: "oklch(0.18 0.01 250)", borderRadius: 10, padding: 18, color: "oklch(0.85 0.03 140)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: "oklch(0.6 0.18 25)" }} />
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: "oklch(0.75 0.15 85)" }} />
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: "oklch(0.65 0.16 150)" }} />
              <div style={{ fontFamily: "'SF Mono', Consolas, monospace", fontSize: 11, color: "oklch(0.6 0.02 140)", marginLeft: 6 }}>
                POST /ssf/streams/&lt;id&gt;
              </div>
            </div>
            <pre style={{ margin: 0, fontFamily: "'SF Mono', Consolas, monospace", fontSize: 11.5, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {jsonPreview}
            </pre>
          </div>

          <button
            onClick={handleSend}
            disabled={sendDisabled}
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderRadius: 8,
              background: "oklch(0.58 0.16 40)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: sendDisabled ? "not-allowed" : "pointer",
              opacity: sendDisabled ? 0.5 : 1,
            }}
          >
            {sending ? "Sending…" : "Send signal"}
          </button>

          {result && (
            <div
              style={{
                background: result.success ? "oklch(0.95 0.03 150)" : "oklch(0.96 0.03 25)",
                border: `1px solid ${result.success ? "oklch(0.85 0.05 150)" : "oklch(0.85 0.06 25)"}`,
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: result.success ? "oklch(0.4 0.12 150)" : "oklch(0.45 0.15 25)",
                }}
              >
                {result.error
                  ? `Error: ${result.error}`
                  : `HTTP ${result.httpStatus} — ${result.success ? "Signal sent" : "Send failed"}`}
              </div>
              <div style={{ fontSize: 12, color: "oklch(0.4 0.01 70)", marginTop: 8 }}>
                Check ISC&apos;s Event Log for Correlated status.
              </div>
            </div>
          )}

          <div
            style={{
              background: "oklch(0.96 0.015 90)",
              border: "1px solid oklch(0.86 0.03 90)",
              borderRadius: 8,
              padding: 14,
              fontSize: 11.5,
              lineHeight: 1.55,
              color: "oklch(0.42 0.03 90)",
            }}
          >
            <strong>Demo note:</strong> the vendor catalog above is curated, illustrative data — nothing
            here calls a real vendor API. The SailPoint side is real: this sends an actual signed
            token to your configured ISC receiver.
          </div>
        </div>
      </div>
    </div>
  );
}
