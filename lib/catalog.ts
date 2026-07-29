import type { CaepEventInput } from "./caep";

// Demo-only vendor scenario catalog. Per the "Demo note" every vendor UI in
// this space carries: nothing here talks to a real vendor product -- these
// are illustrative trigger codes/narratives mapped onto real, supported
// CAEP event types. See "How to Build the SSF Transmitter.md"'s "Catalog
// fields to lock" and Section 7 item 5/6 of HANDOFF_RUNBOOK.md (vendor
// variety lives here, not in Workflow branching logic -- ISC strips custom
// claims, so each CAEP type gets its own Workflow, not a shared one).
export interface VendorScenario {
  vendor: string;
  displayName: string;
  triggerCode: string;
  // Everything sendSsfSignal() needs, minus subjectEmail (supplied at send
  // time, not baked into the catalog).
  event: Omit<CaepEventInput, "subjectEmail">;
}

export const VENDOR_SCENARIOS: Record<string, VendorScenario> = {
  "okta-impossible-travel": {
    vendor: "Okta",
    displayName: "Account Takeover / Impossible Travel Success",
    triggerCode: "security.threat.detected.impossible_travel",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Okta",
      vendorEventType: "impossible_travel",
      recommendedAction: "disable_account",
      reasonAdmin: "Okta: Account Takeover / Impossible Travel Success",
    },
  },
  "microsoft-leaked-credentials": {
    vendor: "Microsoft",
    displayName: "Leaked Credentials",
    triggerCode: "riskEventType:leakedCredentials",
    event: {
      type: "credential-change",
      // Per OpenID CAEP spec: credential_type/change_type enums.
      claims: { credential_type: "password", change_type: "revoke" },
      vendor: "Microsoft",
      vendorEventType: "leaked_credentials",
      recommendedAction: "disable_account",
      reasonAdmin: "Microsoft: Leaked Credentials Detected",
    },
  },
  "jamf-device-noncompliant": {
    vendor: "Jamf",
    displayName: "Device Non-Compliant",
    triggerCode: "device.compliance.non_compliant",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "Jamf",
      vendorEventType: "device_noncompliant",
      recommendedAction: "disable_account",
      reasonAdmin:
        "Jamf: Device falls out of compliance (jailbreak, missing EDR, unauthorized software, required security settings disabled)",
    },
  },
  "proofpoint-session-revoked": {
    vendor: "Proofpoint",
    displayName: "Suspicious Session Revoked",
    triggerCode: "proofpoint.tap.session_revoked",
    event: {
      type: "session-revoked",
      claims: {}, // no required claims per the CAEP spec for this type
      vendor: "Proofpoint",
      vendorEventType: "suspicious_session",
      recommendedAction: "disable_account",
      reasonAdmin: "Proofpoint: Suspicious Session Revoked",
    },
  },
  "zscaler-risk-claim-change": {
    vendor: "Zscaler",
    displayName: "Risk Posture Claim Change",
    triggerCode: "zscaler.zia.risk_claim_change",
    event: {
      type: "token-claims-change",
      // Per OpenID CAEP spec: `claims` is a JSON object of new claim value(s).
      // `initiating_entity: "policy"` is required here too -- confirmed via
      // the live Workflow's own trigger filter
      // (`[?(@.initiating_entity== "policy")]`), not just the spec example.
      claims: { claims: { risk_score: "high" }, initiating_entity: "policy" },
      vendor: "Zscaler",
      vendorEventType: "risk_claim_change",
      recommendedAction: "create_certification_campaign",
      reasonAdmin: "Zscaler: Risk Posture Claim Change",
    },
  },
};
