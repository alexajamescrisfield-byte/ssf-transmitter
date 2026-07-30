"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAEP_EVENT_TYPES, CAEP_REQUIRED_CLAIMS, type CaepEventType } from "@/lib/caep";

export interface CatalogRow {
  id: string;
  key: string;
  vendor: string;
  displayName: string;
  triggerCode: string;
  caepType: string;
}

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

function placeholderClaims(caepType: CaepEventType): string {
  const required = CAEP_REQUIRED_CLAIMS[caepType];
  if (required.length === 0) return "{}";
  const obj: Record<string, string> = {};
  for (const key of required) obj[key] = "";
  return JSON.stringify(obj, null, 2);
}

export default function CatalogManager({ rows }: { rows: CatalogRow[] }) {
  const router = useRouter();
  const [vendor, setVendor] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [triggerCode, setTriggerCode] = useState("");
  const [caepType, setCaepType] = useState<CaepEventType>("risk-level-change");
  const [claimsText, setClaimsText] = useState(placeholderClaims("risk-level-change"));
  const [vendorEventType, setVendorEventType] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [reasonAdmin, setReasonAdmin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetForm() {
    setVendor("");
    setDisplayName("");
    setTriggerCode("");
    setCaepType("risk-level-change");
    setClaimsText(placeholderClaims("risk-level-change"));
    setVendorEventType("");
    setRecommendedAction("");
    setReasonAdmin("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let claims: Record<string, unknown>;
    try {
      claims = JSON.parse(claimsText);
    } catch {
      setError("Claims must be valid JSON");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor,
          displayName,
          triggerCode,
          caepType,
          claims,
          vendorEventType: vendorEventType || undefined,
          recommendedAction: recommendedAction || undefined,
          reasonAdmin: reasonAdmin || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add scenario");
        return;
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete "${label}" from the catalog? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/scenarios/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete scenario");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const requiredClaims = CAEP_REQUIRED_CLAIMS[caepType];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 24, alignItems: "start" }}>
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
            gridTemplateColumns: "1fr 1.4fr 1.2fr auto",
            gap: 8,
            padding: "12px 20px",
            background: "oklch(0.95 0.01 70)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "oklch(0.45 0.01 70)",
          }}
        >
          <div>VENDOR</div>
          <div>EVENT</div>
          <div>CAEP TYPE</div>
          <div />
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 1.2fr auto",
              gap: 8,
              padding: "12px 20px",
              borderTop: "1px solid oklch(0.92 0.01 70)",
              fontSize: 12.5,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600 }}>{row.vendor}</div>
            <div>{row.displayName}</div>
            <div
              style={{
                fontFamily: "'SF Mono', Consolas, monospace",
                fontSize: 11,
                color: "oklch(0.45 0.01 70)",
              }}
            >
              {row.caepType}
            </div>
            <button
              onClick={() => handleDelete(row.id, `${row.vendor} — ${row.displayName}`)}
              disabled={deletingId === row.id}
              style={{
                background: "none",
                border: "none",
                color: "oklch(0.55 0.15 25)",
                fontSize: 12,
                fontWeight: 600,
                cursor: deletingId === row.id ? "not-allowed" : "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              {deletingId === row.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "oklch(0.55 0.01 70)", fontSize: 13 }}>
            No catalog scenarios yet.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={SECTION_STYLE}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Add vendor event</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Vendor</label>
            <input style={INPUT_STYLE} value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Zscaler" required />
          </div>
          <div>
            <label style={LABEL_STYLE}>Trigger code</label>
            <input
              style={INPUT_STYLE}
              value={triggerCode}
              onChange={(e) => setTriggerCode(e.target.value)}
              placeholder="e.g. zs_c2_beaconing"
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Event display name</label>
          <input
            style={INPUT_STYLE}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. C2 Beaconing Detected"
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>CAEP type</label>
          <select
            style={{ ...INPUT_STYLE, background: "white" }}
            value={caepType}
            onChange={(e) => {
              const next = e.target.value as CaepEventType;
              setCaepType(next);
              setClaimsText(placeholderClaims(next));
            }}
          >
            {CAEP_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>
            Claims (JSON){" "}
            {requiredClaims.length > 0 && (
              <span style={{ fontWeight: 400, color: "oklch(0.55 0.01 70)" }}>
                — required: {requiredClaims.join(", ")}
              </span>
            )}
          </label>
          <textarea
            style={{ ...INPUT_STYLE, fontFamily: "'SF Mono', Consolas, monospace", fontSize: 12, minHeight: 90 }}
            value={claimsText}
            onChange={(e) => setClaimsText(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Reason (narrative text shown in emails/audit)</label>
          <input
            style={INPUT_STYLE}
            value={reasonAdmin}
            onChange={(e) => setReasonAdmin(e.target.value)}
            placeholder="e.g. Zscaler: C2 Beaconing Detected"
          />
        </div>

        <details style={{ marginBottom: 16 }}>
          <summary style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.45 0.01 70)", cursor: "pointer" }}>
            Advanced (optional, stripped by ISC before a Workflow sees it — audit value only)
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <div>
              <label style={LABEL_STYLE}>Vendor event type</label>
              <input style={INPUT_STYLE} value={vendorEventType} onChange={(e) => setVendorEventType(e.target.value)} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Recommended action</label>
              <input style={INPUT_STYLE} value={recommendedAction} onChange={(e) => setRecommendedAction(e.target.value)} />
            </div>
          </div>
        </details>

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
          {submitting ? "Adding…" : "Add scenario"}
        </button>
      </form>
    </div>
  );
}
