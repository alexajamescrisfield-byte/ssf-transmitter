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

  // --- Imported 2026-07-29 from a teammate's separate SSF Signals Portal UI
  // export (different transmitter/tenant: acme-demo). Claim shapes verified
  // against our own CAEP_REQUIRED_CLAIMS before import -- all matched. Their
  // export's `sub_id`/`subject` "complex" wrapper format was deliberately
  // NOT carried over: our sendSsfSignal() builds sub_id itself from a plain
  // subjectEmail, using the flat {format:"email", email:...} shape already
  // proven to correlate correctly against company21912-poc across all 3
  // tested CAEP types. See HANDOFF_RUNBOOK.md for the compatibility
  // analysis and the "complex" format test.
  "crowdstrike-host-isolated": {
    vendor: "CrowdStrike",
    displayName: "Host Isolated",
    triggerCode: "host_isolated",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "CrowdStrike",
      vendorEventType: "host_isolated",
      recommendedAction: "require_reauth",
      reasonAdmin: "CrowdStrike: Host Isolated",
    },
  },
  "crowdstrike-host-isolated-device": {
    vendor: "CrowdStrike",
    displayName: "Host Isolated (Device Compliance)",
    triggerCode: "cs_host_isolated",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "CrowdStrike",
      vendorEventType: "cs_host_isolated",
      recommendedAction: "block_device",
      reasonAdmin: "CrowdStrike: Host Isolated",
    },
  },
  "crowdstrike-identity-compromise": {
    vendor: "CrowdStrike",
    displayName: "Identity Compromise Detected",
    triggerCode: "cs_identity_compromise",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "MEDIUM" },
      vendor: "CrowdStrike",
      vendorEventType: "cs_identity_compromise",
      recommendedAction: "restrict_access",
      reasonAdmin: "CrowdStrike: Identity Compromise Detected",
    },
  },
  "microsoft-high-risk-user": {
    vendor: "Microsoft",
    displayName: "High-Risk User Flagged",
    triggerCode: "ms_high_risk_user",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Microsoft",
      vendorEventType: "ms_high_risk_user",
      recommendedAction: "restrict_access",
      reasonAdmin: "Microsoft: High-Risk User Flagged",
    },
  },
  "microsoft-session-hijack": {
    vendor: "Microsoft",
    displayName: "Session Hijack Detected",
    triggerCode: "ms_session_hijack",
    event: {
      type: "session-revoked",
      claims: {}, // no required claims per the CAEP spec for this type
      vendor: "Microsoft",
      vendorEventType: "ms_session_hijack",
      recommendedAction: "force_reauth",
      reasonAdmin: "Microsoft: Session Hijack Detected",
    },
  },
  "okta-credential-reset": {
    vendor: "Okta",
    displayName: "Credential Reset",
    triggerCode: "okta_credential_reset",
    event: {
      type: "credential-change",
      claims: { credential_type: "password", change_type: "revoke" },
      vendor: "Okta",
      vendorEventType: "okta_credential_reset",
      recommendedAction: "require_reauth",
      reasonAdmin: "Okta: Credential Reset",
    },
  },
  "okta-mfa-unenroll": {
    vendor: "Okta",
    displayName: "MFA Unenrollment",
    triggerCode: "okta_mfa_unenroll",
    event: {
      type: "credential-change",
      claims: { credential_type: "mfa", change_type: "revoke" },
      vendor: "Okta",
      vendorEventType: "okta_mfa_unenroll",
      recommendedAction: "require_mfa_reenroll",
      reasonAdmin: "Okta: MFA Unenrollment",
    },
  },
  "okta-session-revoked": {
    vendor: "Okta",
    displayName: "Session Revoked",
    triggerCode: "okta_session_revoked",
    event: {
      type: "session-revoked",
      claims: {},
      vendor: "Okta",
      vendorEventType: "okta_session_revoked",
      recommendedAction: "force_reauth",
      reasonAdmin: "Okta: Session Revoked",
    },
  },
  "proofpoint-dlp-violation": {
    vendor: "Proofpoint",
    displayName: "DLP Violation",
    triggerCode: "pfpt_dlp_violation",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Proofpoint",
      vendorEventType: "pfpt_dlp_violation",
      recommendedAction: "restrict_access",
      reasonAdmin: "Proofpoint: DLP Violation",
    },
  },
  "proofpoint-tap-click": {
    vendor: "Proofpoint",
    displayName: "TAP Malicious Click",
    triggerCode: "pfpt_tap_click",
    event: {
      type: "risk-level-change",
      claims: { current_level: "MEDIUM", previous_level: "LOW" },
      vendor: "Proofpoint",
      vendorEventType: "pfpt_tap_click",
      recommendedAction: "require_reauth",
      reasonAdmin: "Proofpoint: TAP Malicious Click",
    },
  },
  "proofpoint-vap-flagged": {
    vendor: "Proofpoint",
    displayName: "Very Attacked Person (VAP) Flagged",
    triggerCode: "pfpt_vap_flagged",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "MEDIUM" },
      vendor: "Proofpoint",
      vendorEventType: "pfpt_vap_flagged",
      recommendedAction: "restrict_access",
      reasonAdmin: "Proofpoint: Very Attacked Person (VAP) Flagged",
    },
  },
  "zscaler-c2-beaconing": {
    vendor: "Zscaler",
    displayName: "C2 Beaconing Detected",
    triggerCode: "zs_c2_beaconing",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Zscaler",
      vendorEventType: "zs_c2_beaconing",
      recommendedAction: "restrict_access",
      reasonAdmin: "Zscaler: C2 Beaconing Detected",
    },
  },
  "zscaler-device-isolated": {
    vendor: "Zscaler",
    displayName: "Device Isolated",
    triggerCode: "zs_device_isolated",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "Zscaler",
      vendorEventType: "zs_device_isolated",
      recommendedAction: "block_device",
      reasonAdmin: "Zscaler: Device Isolated",
    },
  },
  "zscaler-landmine": {
    vendor: "Zscaler",
    displayName: "Landmine Triggered",
    triggerCode: "zs_landmine",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "MEDIUM" },
      vendor: "Zscaler",
      vendorEventType: "zs_landmine",
      recommendedAction: "restrict_access",
      reasonAdmin: "Zscaler: Landmine Triggered",
    },
  },
};
