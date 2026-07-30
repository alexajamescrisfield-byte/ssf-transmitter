"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAEP_EVENT_TYPES,
  CURRENT_LEVEL_VALUES,
  CURRENT_STATUS_VALUES,
  CREDENTIAL_TYPE_VALUES,
  CHANGE_TYPE_VALUES,
  type CaepEventType,
} from "@/lib/caep";

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

interface TokenClaimRow {
  key: string;
  value: string;
}

export default function CatalogManager({ rows }: { rows: CatalogRow[] }) {
  const router = useRouter();
  const [vendor, setVendor] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [triggerCode, setTriggerCode] = useState("");
  const [caepType, setCaepType] = useState<CaepEventType>("risk-level-change");

  // One set of controlled fields per CAEP type -- every value the person can
  // pick comes from a dropdown backed by lib/caep.ts's spec-confirmed enum
  // lists, so a typo like the lowercase "high" that broke sends before
  // (HANDOFF_RUNBOOK.md Section 3.5 item 11) can't happen here.
  const [currentLevel, setCurrentLevel] = useState<string>(CURRENT_LEVEL_VALUES[2]);
  const [previousLevel, setPreviousLevel] = useState<string>(CURRENT_LEVEL_VALUES[0]);
  const [currentStatus, setCurrentStatus] = useState<string>(CURRENT_STATUS_VALUES[1]);
  const [previousStatus, setPreviousStatus] = useState<string>(CURRENT_STATUS_VALUES[0]);
  const [credentialType, setCredentialType] = useState<string>(CREDENTIAL_TYPE_VALUES[0]);
  const [changeType, setChangeType] = useState<string>(CHANGE_TYPE_VALUES[1]);
  const [tokenClaimRows, setTokenClaimRows] = useState<TokenClaimRow[]>([{ key: "", value: "" }]);

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
    setCurrentLevel(CURRENT_LEVEL_VALUES[2]);
    setPreviousLevel(CURRENT_LEVEL_VALUES[0]);
    setCurrentStatus(CURRENT_STATUS_VALUES[1]);
    setPreviousStatus(CURRENT_STATUS_VALUES[0]);
    setCredentialType(CREDENTIAL_TYPE_VALUES[0]);
    setChangeType(CHANGE_TYPE_VALUES[1]);
    setTokenClaimRows([{ key: "", value: "" }]);
    setVendorEventType("");
    setRecommendedAction("");
    setReasonAdmin("");
  }

  function buildClaims(): Record<string, unknown> {
    switch (caepType) {
      case "risk-level-change":
        return { current_level: currentLevel, previous_level: previousLevel };
      case "device-compliance-change":
        return { current_status: currentStatus, previous_status: previousStatus };
      case "credential-change":
        return { credential_type: credentialType, change_type: changeType };
      case "session-revoked":
        return {};
      case "token-claims-change": {
        const claims: Record<string, string> = {};
        for (const row of tokenClaimRows) {
          if (row.key.trim()) claims[row.key.trim()] = row.value;
        }
        // initiating_entity is NOT sent from here -- the server always
        // forces it to "policy" (lib/vendorScenarios.ts), which is the only
        // value that actually fires the live Workflow. No form field for it
        // on purpose, so there's nothing to get wrong.
        return { claims };
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (caepType === "token-claims-change" && Object.keys(buildClaims().claims as object).length === 0) {
      setError("Add at least one claim (e.g. risk_score = high)");
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
          claims: buildClaims(),
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
            onChange={(e) => setCaepType(e.target.value as CaepEventType)}
          >
            {CAEP_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Claims: one set of dropdowns/fields per CAEP type, backed by
            lib/caep.ts's closed enum lists -- nothing here is free-typed, so
            a value ISC would reject can't be entered. */}
        {caepType === "risk-level-change" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Previous level</label>
              <select style={{ ...INPUT_STYLE, background: "white" }} value={previousLevel} onChange={(e) => setPreviousLevel(e.target.value)}>
                {CURRENT_LEVEL_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Current level</label>
              <select style={{ ...INPUT_STYLE, background: "white" }} value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)}>
                {CURRENT_LEVEL_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {caepType === "device-compliance-change" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Previous status</label>
              <select style={{ ...INPUT_STYLE, background: "white" }} value={previousStatus} onChange={(e) => setPreviousStatus(e.target.value)}>
                {CURRENT_STATUS_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Current status</label>
              <select style={{ ...INPUT_STYLE, background: "white" }} value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)}>
                {CURRENT_STATUS_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {caepType === "credential-change" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Credential type</label>
              <select style={{ ...INPUT_STYLE, background: "white" }} value={credentialType} onChange={(e) => setCredentialType(e.target.value)}>
                {CREDENTIAL_TYPE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Change type</label>
              <select style={{ ...INPUT_STYLE, background: "white" }} value={changeType} onChange={(e) => setChangeType(e.target.value)}>
                {CHANGE_TYPE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {caepType === "session-revoked" && (
          <div
            style={{
              marginBottom: 12,
              fontSize: 12,
              color: "oklch(0.55 0.01 70)",
              background: "oklch(0.95 0.01 70)",
              borderRadius: 6,
              padding: "10px 12px",
            }}
          >
            This event type has no required claims.
          </div>
        )}

        {caepType === "token-claims-change" && (
          <div style={{ marginBottom: 12 }}>
            <label style={LABEL_STYLE}>Claims changed</label>
            {tokenClaimRows.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                <input
                  style={INPUT_STYLE}
                  placeholder="claim name, e.g. risk_score"
                  value={row.key}
                  onChange={(e) => {
                    const next = [...tokenClaimRows];
                    next[i] = { ...next[i], key: e.target.value };
                    setTokenClaimRows(next);
                  }}
                />
                <input
                  style={INPUT_STYLE}
                  placeholder="new value, e.g. high"
                  value={row.value}
                  onChange={(e) => {
                    const next = [...tokenClaimRows];
                    next[i] = { ...next[i], value: e.target.value };
                    setTokenClaimRows(next);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setTokenClaimRows(tokenClaimRows.filter((_, j) => j !== i))}
                  disabled={tokenClaimRows.length === 1}
                  style={{
                    background: "none",
                    border: "1px solid oklch(0.85 0.02 75)",
                    borderRadius: 6,
                    color: "oklch(0.55 0.01 70)",
                    cursor: tokenClaimRows.length === 1 ? "not-allowed" : "pointer",
                    padding: "0 10px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTokenClaimRows([...tokenClaimRows, { key: "", value: "" }])}
              style={{
                background: "none",
                border: "none",
                color: "oklch(0.5 0.16 40)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                marginBottom: 8,
              }}
            >
              + Add another claim
            </button>
            <div
              style={{
                fontSize: 11.5,
                color: "oklch(0.55 0.01 70)",
                background: "oklch(0.95 0.01 70)",
                borderRadius: 6,
                padding: "10px 12px",
                lineHeight: 1.5,
              }}
            >
              This will always be sent with <code>initiating_entity: &quot;policy&quot;</code> — the one value
              that actually fires the live Workflow (confirmed 2026-07-29). You don&apos;t need to set this
              yourself.
            </div>
          </div>
        )}

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
