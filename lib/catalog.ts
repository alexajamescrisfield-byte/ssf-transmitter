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
// CrowdStrike, Proofpoint, Jamf -- each with the realistic event set a
// teammate's separate SSF Signals Portal actually ships (event names and
// CAEP-type assignments are real, tested ground truth from that app).
// Deliberately NOT forced into an even 5-CAEP-types-per-vendor grid --
// each vendor's events map to whichever CAEP type is honest for that
// vendor's real product (Jamf skews device-compliance-change since it's
// an MDM; Okta skews risk-level-change since it's an identity risk
// engine). See HANDOFF_RUNBOOK.md Section 3.17 for the full mapping
// table and which assignments are confirmed vs. judgment calls.
//
// The claim CONTENT here is our own, not copied from that other app --
// their example payload for one of these events was missing CAEP's
// required claims (current_level/previous_level) and used non-standard
// custom fields (reason/action) instead of the spec's reason_admin.
// Every entry below passes buildCaepEvent()'s required-claim validation.
export interface VendorScenario {
  vendor: string;
  displayName: string;
  triggerCode: string;
  // Everything sendSsfSignal() needs, minus subjectEmail (supplied at send
  // time, not baked into the catalog).
  event: Omit<CaepEventInput, "subjectEmail">;
}

export const VENDOR_SCENARIOS: Record<string, VendorScenario> = {
  // --- Okta (5) -- all risk-level-change: Okta's real alerting (ThreatInsight,
  // adaptive MFA, sign-on policy) is fundamentally an identity-risk signal
  // engine, not a device or credential-lifecycle manager, so an uneven
  // distribution here is the honest one, not a gap.
  "okta-impossible-travel": {
    vendor: "Okta",
    displayName: "Account Takeover / Impossible Travel Success",
    triggerCode: "okta.threat.impossible_travel",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Okta",
      vendorEventType: "impossible_travel",
      recommendedAction: "disable_account",
      reasonAdmin: "Account Takeover / Impossible Travel Success",
    },
  },
  "okta-attack-started": {
    vendor: "Okta",
    displayName: "Attack Started (Org Under Attack)",
    triggerCode: "okta.threatinsight.org_under_attack",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "MEDIUM" },
      vendor: "Okta",
      vendorEventType: "org_under_attack",
      recommendedAction: "disable_account",
      reasonAdmin: "Organization-wide attack campaign detected (Okta ThreatInsight)",
    },
  },
  "okta-threat-detected": {
    vendor: "Okta",
    displayName: "High Threat Detected (ThreatInsight)",
    triggerCode: "okta.threatinsight.high_threat",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Okta",
      vendorEventType: "threatinsight_high_threat",
      recommendedAction: "disable_account",
      reasonAdmin: "High threat detected via Okta ThreatInsight",
    },
  },
  "okta-mfa-fatigue": {
    vendor: "Okta",
    displayName: "MFA Fatigue / Push Bombing Success",
    triggerCode: "okta.mfa.push_bombing_success",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Okta",
      vendorEventType: "mfa_push_bombing_success",
      recommendedAction: "disable_account",
      reasonAdmin: "Multiple MFA pushes followed by success (push bombing)",
    },
  },
  "okta-risky-device": {
    vendor: "Okta",
    displayName: "New Risky Device + Location",
    triggerCode: "okta.risk.new_device_location",
    event: {
      type: "risk-level-change",
      claims: { current_level: "MEDIUM", previous_level: "LOW" },
      vendor: "Okta",
      vendorEventType: "new_risky_device_location",
      recommendedAction: "require_reauth",
      reasonAdmin: "Sign-in from a new, unrecognized device and location",
    },
  },

  // --- Microsoft (5)
  "microsoft-impossible-travel": {
    vendor: "Microsoft",
    displayName: "Impossible Travel Sign-in",
    triggerCode: "ms.identityProtection.impossibleTravel",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Microsoft",
      vendorEventType: "impossible_travel",
      recommendedAction: "disable_account",
      reasonAdmin: "Impossible Travel Sign-in",
    },
  },
  "microsoft-leaked-credentials": {
    vendor: "Microsoft",
    displayName: "Leaked Credentials Confirmed",
    triggerCode: "riskEventType:leakedCredentials",
    event: {
      type: "credential-change",
      // Per OpenID CAEP spec: credential_type/change_type enums.
      claims: { credential_type: "password", change_type: "revoke" },
      vendor: "Microsoft",
      vendorEventType: "leaked_credentials",
      recommendedAction: "disable_account",
      reasonAdmin: "Leaked Credentials Confirmed",
    },
  },
  "microsoft-atypical-signin": {
    vendor: "Microsoft",
    displayName: "Medium Risk Atypical Sign-in",
    triggerCode: "ms.identityProtection.atypicalSignin",
    event: {
      type: "risk-level-change",
      claims: { current_level: "MEDIUM", previous_level: "LOW" },
      vendor: "Microsoft",
      vendorEventType: "atypical_signin",
      recommendedAction: "require_reauth",
      reasonAdmin: "Medium Risk Atypical Sign-in",
    },
  },
  "microsoft-password-spray": {
    vendor: "Microsoft",
    displayName: "Password Spray Attack Success",
    triggerCode: "ms.identityProtection.passwordSpray",
    event: {
      type: "credential-change",
      claims: { credential_type: "password", change_type: "revoke" },
      vendor: "Microsoft",
      vendorEventType: "password_spray_success",
      recommendedAction: "disable_account",
      reasonAdmin: "Password Spray Attack Success",
    },
  },
  "microsoft-mailbox-rule": {
    vendor: "Microsoft",
    displayName: "Post-Compromise Mailbox Rule Created",
    triggerCode: "ms.exchange.suspiciousMailboxRule",
    event: {
      type: "session-revoked",
      claims: {}, // no required claims per the CAEP spec for this type
      vendor: "Microsoft",
      vendorEventType: "post_compromise_mailbox_rule",
      recommendedAction: "force_reauth",
      reasonAdmin: "Post-Compromise Mailbox Rule Created",
    },
  },

  // --- CrowdStrike (5, trimmed from a 10-event reference list -- kept the
  // 5 with the clearest, most distinct CAEP-type fit)
  "crowdstrike-identity-risk": {
    vendor: "CrowdStrike",
    displayName: "High Identity Risk",
    triggerCode: "cs.identity.high_risk",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "MEDIUM" },
      vendor: "CrowdStrike",
      vendorEventType: "high_identity_risk",
      recommendedAction: "disable_account",
      reasonAdmin: "High Identity Risk",
    },
  },
  "crowdstrike-compromised-password": {
    vendor: "CrowdStrike",
    displayName: "Compromised Password Detected",
    triggerCode: "cs.identity.compromised_password",
    event: {
      type: "credential-change",
      claims: { credential_type: "password", change_type: "revoke" },
      vendor: "CrowdStrike",
      vendorEventType: "compromised_password",
      recommendedAction: "disable_account",
      reasonAdmin: "Compromised Password Detected",
    },
  },
  "crowdstrike-ransomware": {
    vendor: "CrowdStrike",
    displayName: "Ransomware / File Encryption",
    triggerCode: "cs.falcon.ransomware_detected",
    event: {
      type: "device-compliance-change",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "CrowdStrike",
      vendorEventType: "ransomware_file_encryption",
      recommendedAction: "block_device",
      reasonAdmin: "Ransomware / File Encryption detected on managed host",
    },
  },
  "crowdstrike-lateral-movement": {
    vendor: "CrowdStrike",
    displayName: "Lateral Movement + Privilege Escalation",
    triggerCode: "cs.falcon.lateral_movement_privesc",
    event: {
      type: "session-revoked",
      claims: {},
      vendor: "CrowdStrike",
      vendorEventType: "lateral_movement_privilege_escalation",
      recommendedAction: "force_reauth",
      reasonAdmin: "Lateral Movement + Privilege Escalation detected",
    },
  },
  "crowdstrike-intel-match": {
    vendor: "CrowdStrike",
    displayName: "Intel Domain / Indicator Match",
    triggerCode: "cs.intel.indicator_match",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "CrowdStrike",
      vendorEventType: "intel_domain_indicator_match",
      recommendedAction: "disable_account",
      reasonAdmin: "Intel Domain / Indicator Match",
    },
  },

  // --- Proofpoint (5)
  "proofpoint-anomalous-email": {
    vendor: "Proofpoint",
    displayName: "Anomalous Email Behavior (Possible ATO)",
    triggerCode: "pfpt.tap.anomalous_email_behavior",
    event: {
      type: "risk-level-change",
      claims: { current_level: "MEDIUM", previous_level: "LOW" },
      vendor: "Proofpoint",
      vendorEventType: "anomalous_email_behavior",
      recommendedAction: "require_reauth",
      reasonAdmin: "Anomalous Email Behavior (Possible ATO)",
    },
  },
  "proofpoint-bec": {
    vendor: "Proofpoint",
    displayName: "BEC / Impostor Message",
    triggerCode: "pfpt.tap.bec_impostor",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Proofpoint",
      vendorEventType: "bec_impostor_message",
      recommendedAction: "restrict_access",
      reasonAdmin: "BEC / Impostor Message",
    },
  },
  "proofpoint-dlp-violation": {
    vendor: "Proofpoint",
    displayName: "Critical DLP Violation (Exfil)",
    triggerCode: "pfpt.dlp.critical_violation_exfil",
    event: {
      type: "risk-level-change",
      claims: { current_level: "HIGH", previous_level: "LOW" },
      vendor: "Proofpoint",
      vendorEventType: "critical_dlp_violation_exfil",
      recommendedAction: "restrict_access",
      reasonAdmin: "Critical DLP Violation (Exfil)",
    },
  },
  "proofpoint-malicious-attachment": {
    vendor: "Proofpoint",
    displayName: "Malicious Attachment Delivered & Clicked",
    triggerCode: "pfpt.tap.malicious_attachment_clicked",
    event: {
      type: "session-revoked",
      claims: {},
      vendor: "Proofpoint",
      vendorEventType: "malicious_attachment_delivered_clicked",
      recommendedAction: "force_reauth",
      reasonAdmin: "Malicious Attachment Delivered & Clicked",
    },
  },
  "proofpoint-malicious-click": {
    vendor: "Proofpoint",
    displayName: "Permitted Click on Malicious URL",
    triggerCode: "pfpt.tap.permitted_malicious_click",
    event: {
      type: "credential-change",
      claims: { credential_type: "password", change_type: "revoke" },
      vendor: "Proofpoint",
      vendorEventType: "permitted_click_malicious_url",
      recommendedAction: "require_reauth",
      reasonAdmin: "Permitted Click on Malicious URL",
    },
  },

  // --- Jamf (4 -- deliberately not padded to 5; all four real events Jamf
  // actually ships map to device-compliance-change, which is honest for an
  // MDM vendor, not a gap to paper over).
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
      // That's correct, intentional behavior (a "back to compliant" event
      // shouldn't trigger a disable action), not a bug -- worth knowing
      // before assuming a failed test.
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
