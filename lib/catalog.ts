import type { CaepEventInput } from "./caep";

// Demo-only vendor scenario catalog. Per the "Demo note" every vendor UI in
// this space carries: nothing here talks to a real vendor product -- these
// are illustrative trigger codes/narratives mapped onto real, supported
// CAEP event types. See "How to Build the SSF Transmitter.md"'s "Catalog
// fields to lock" and Section 7 item 5/6 of HANDOFF_RUNBOOK.md (vendor
// variety lives here, not in Workflow branching logic -- ISC strips custom
// claims, so each CAEP type gets its own Workflow, not a shared one).
//
// Restricted 2026-07-29 to exactly 5 vendors -- Okta, Microsoft,
// CrowdStrike, Proofpoint, Jamf. The 14 CrowdStrike/Microsoft/Okta/
// Proofpoint scenarios below are the original set imported from a
// teammate's separate SSF Signals Portal export (different transmitter/
// tenant: acme-demo) -- restored here after a brief detour through a
// different 24-scenario set built from a second reference app, which was
// reverted back to this one per explicit direction. The teammate's export
// used a `sub_id`/`subject` "complex" wrapper format, deliberately NOT
// carried over -- our sendSsfSignal() builds sub_id itself from a plain
// subjectEmail, using the flat {format:"email", email:...} shape already
// proven to correlate correctly against company21912-poc. See
// HANDOFF_RUNBOOK.md for the compatibility analysis and format test.
//
// Zscaler (the payload's 5th vendor, 3 scenarios: C2 Beaconing, Device
// Isolated, Landmine Triggered -- including our only token-claims-change
// scenario) is deliberately dropped per the "vendors should only be"
// scope decision. Jamf (4 scenarios, all device-compliance-change) fills
// the 5th vendor slot instead, using real event names from a second
// reference app, already vetted and approved.
export interface VendorScenario {
  vendor: string;
  displayName: string;
  triggerCode: string;
  // Everything sendSsfSignal() needs, minus subjectEmail (supplied at send
  // time, not baked into the catalog).
  event: Omit<CaepEventInput, "subjectEmail">;
}

export const VENDOR_SCENARIOS: Record<string, VendorScenario> = {
  // --- CrowdStrike (3, from the teammate's export)
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

  // --- Microsoft (2, from the teammate's export)
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

  // --- Okta (3, from the teammate's export)
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

  // --- Proofpoint (3, from the teammate's export)
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

  // --- Jamf (4 -- fills the 5th vendor slot in place of Zscaler; real
  // event names from a second reference app, all device-compliance-change,
  // which is the honest result for an MDM vendor, not a gap)
  "jamf-device-noncompliant": {
    vendor: "Jamf",
    displayName: "Device Non-Compliant",
    triggerCode: "jamf.compliance.device_non_compliant",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "Jamf",
      vendorEventType: "device_non_compliant",
      recommendedAction: "disable_account",
      reasonAdmin:
        "Jamf: Device falls out of compliance (jailbreak, missing EDR, unauthorized software, required security settings disabled)",
    },
  },
  "jamf-returned-to-compliance": {
    vendor: "Jamf",
    displayName: "Device Returned to Compliance",
    triggerCode: "jamf.compliance.device_returned_to_compliance",
    event: {
      // Reverse direction from the other Jamf scenarios. NOTE: the live
      // device-compliance-change Workflow's trigger filter only matches
      // current_status == "not-compliant" (Section 3.10) -- sending this
      // scenario will correlate but will NOT fire the disable Workflow.
      // Confirmed live 2026-07-29 -- correct, intentional behavior, not a
      // bug.
      type: "device-compliance-change",
      claims: { current_status: "compliant", previous_status: "not-compliant" },
      vendor: "Jamf",
      vendorEventType: "device_returned_to_compliance",
      recommendedAction: "enable_account",
      reasonAdmin: "Jamf: Device returned to compliance",
    },
  },
  "jamf-management-lost": {
    vendor: "Jamf",
    displayName: "Management Status Lost",
    triggerCode: "jamf.mdm.management_status_lost",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "Jamf",
      vendorEventType: "management_status_lost",
      recommendedAction: "disable_account",
      reasonAdmin: "Jamf: MDM management status lost for device",
    },
  },
  "jamf-security-tool-missing": {
    vendor: "Jamf",
    displayName: "Required Security Tool Missing",
    triggerCode: "jamf.compliance.required_security_tool_missing",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "Jamf",
      vendorEventType: "required_security_tool_missing",
      recommendedAction: "disable_account",
      reasonAdmin: "Jamf: Required security tool missing from managed device",
    },
  },
};
