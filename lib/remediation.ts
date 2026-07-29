import type { CaepEventType } from "./caep";

// Canonical CAEP-type -> live ISC Workflow + SailPoint action, per
// HANDOFF_RUNBOOK.md Section 3.17. Fixed 1:1 with CAEP type -- every
// scenario of a given type fires the same Workflow and action regardless of
// vendor (runbook Section 7 item 5: one Workflow per CAEP type, not per
// vendor). Defined once here so the Simulator UI never invents or duplicates
// this text per scenario.
export const CAEP_TYPE_REMEDIATION: Record<
  CaepEventType,
  { workflowName: string; sailpointAction: string }
> = {
  "risk-level-change": {
    workflowName: "SSF Injector Demo - Remove Access When Risk Level Changes",
    sailpointAction: "Disable access to the PRISM application",
  },
  "device-compliance-change": {
    workflowName: "SSF Injector Demo - Remove Access on Device Non-Compliance",
    sailpointAction: "Disable access to the PRISM application and Active Directory",
  },
  "credential-change": {
    workflowName: "SSF Injector Demo - Remove Access + Certify When Credential Changes",
    sailpointAction:
      "Disable access to the PRISM application and Active Directory, create certification campaign",
  },
  "session-revoked": {
    workflowName: "SSF Injector Demo - Remove Access + Certify When Session Revoked",
    sailpointAction:
      "Disable access to the PRISM application and Active Directory, create certification campaign",
  },
  "token-claims-change": {
    workflowName: "Create a Certification Campaign When Token Claims Change",
    sailpointAction: 'Create certification campaign ("Emergency Access Review")',
  },
};

// Per-scenario overrides for cases where the CAEP-type-level default above
// isn't the right text. "jamf-returned-to-compliance" is the reverse
// direction of the device-compliance-change trigger: the Workflow's
// "Check Compliance Status" choice step (added 2026-07-29) now branches on
// the official current_status claim -- not-compliant disables PRISM+AD,
// compliant re-enables them -- so this scenario has a real, distinct action
// from the rest of its CAEP type, not "does nothing."
export const SCENARIO_ACTION_OVERRIDE: Record<string, string> = {
  "jamf-returned-to-compliance": "Re-enable access to the PRISM application and Active Directory",
};

export function sailpointActionFor(scenarioKey: string, caepType: CaepEventType): string {
  return SCENARIO_ACTION_OVERRIDE[scenarioKey] ?? CAEP_TYPE_REMEDIATION[caepType].sailpointAction;
}
