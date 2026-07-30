// The only five CAEP event types SailPoint ISC's SSF Receiver supports.
// Never invent a sixth. See "How to Build the SSF Transmitter.md".
export const CAEP_EVENT_TYPES = [
  "risk-level-change",
  "credential-change",
  "device-compliance-change",
  "session-revoked",
  "token-claims-change",
] as const;

export type CaepEventType = (typeof CAEP_EVENT_TYPES)[number];

export function caepEventTypeUri(type: CaepEventType): string {
  return `https://schemas.openid.net/secevent/caep/event-type/${type}`;
}

// Claims ISC requires per event type, beyond the common `subject` /
// `event_timestamp` fields every CAEP event carries. Saving a catalog
// scenario without these must be blocked before it ever reaches the wire --
// missing claims deliver fine over HTTP and still fail to fire a Workflow.
export const CAEP_REQUIRED_CLAIMS: Record<CaepEventType, string[]> = {
  "risk-level-change": ["current_level", "previous_level"],
  "credential-change": ["credential_type", "change_type"],
  "device-compliance-change": ["current_status", "previous_status"],
  "session-revoked": [],
  "token-claims-change": ["claims"],
};

// Closed enum lists for claim values ISC actually enforces. Single source of
// truth for both the Admin catalog form (dropdowns, no free typing) and
// server-side validation in lib/vendorScenarios.ts -- a typo like the
// lowercase "high" that broke every risk-level-change send until caught
// (HANDOFF_RUNBOOK.md Section 3.5 item 11) should be structurally
// impossible to enter, not just documented.
//
// current_level/previous_level: not part of the base OpenID CAEP 1.0 spec
// (that spec only defines "Assurance Level Change" with NIST-AAL levels) --
// "risk-level-change" is ISC's own CAEP event, and LOW/MEDIUM/HIGH are the
// only values ever empirically proven against this tenant. Deliberately not
// widened with an unverified 4th value (e.g. "EXTREME") -- see this
// project's standing rule of never inventing untested enum values.
export const CURRENT_LEVEL_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;

// device-compliance-change: confirmed exhaustive per the OpenID CAEP 1.0
// spec's Device Compliance Change event definition.
export const CURRENT_STATUS_VALUES = ["compliant", "not-compliant"] as const;

// credential-change: confirmed exhaustive per the OpenID CAEP 1.0 spec's
// Credential Change event definition.
export const CREDENTIAL_TYPE_VALUES = [
  "password",
  "pin",
  "x509",
  "fido2-platform",
  "fido2-roaming",
  "fido-u2f",
  "verifiable-credential",
  "phone-voice",
  "phone-sms",
  "app",
] as const;
export const CHANGE_TYPE_VALUES = ["create", "revoke", "update", "delete"] as const;

// token-claims-change: the live "Create a Certification Campaign When Token
// Claims Change" Workflow's trigger filter requires initiating_entity ==
// "policy" (confirmed via GET /beta/trigger-subscriptions, not just the
// spec example -- HANDOFF_RUNBOOK.md Section 3.12). This is the one value
// that actually fires the proven Workflow; buildCaepEvent()/
// createVendorScenario() always inject it for this type rather than
// trusting a caller to remember it, since a scenario built without it
// delivers and correlates fine but silently never fires anything.
export const TOKEN_CLAIMS_INITIATING_ENTITY = "policy" as const;

export interface CaepEventInput {
  type: CaepEventType;
  subjectEmail: string;
  claims: Record<string, unknown>;
  // Per "How to Build the SSF Transmitter.md"'s Event model section: these
  // three claims exist so a single Workflow can branch on vendor/action
  // instead of needing one hardcoded Workflow per vendor scenario.
  // CONFIRMED 2026-07-28 against a real ISC tenant: ISC strips all three of
  // these before a Workflow trigger ever sees them (OpenID SSF spec 4.2.3 --
  // receivers MUST ignore claims they don't recognize). Kept for the SET's
  // audit/history value and because a future receiver might not filter them,
  // but do not design any Workflow logic around them arriving intact.
  vendor?: string;
  vendorEventType?: string;
  recommendedAction?: string;
  // Per the OpenID CAEP spec, `reason_admin`/`reason_user` are OFFICIAL
  // optional claims on every CAEP event type (unlike the three above) --
  // human-readable reason text. Because they're part of the recognized
  // schema, not a custom field, these are the ones actually worth relying
  // on to carry vendor/narrative context through to a Workflow (e.g. for a
  // notification step) -- not yet confirmed empirically that ISC preserves
  // them, but far more likely to than the fields above.
  reasonAdmin?: string;
  reasonUser?: string;
}

export class MissingCaepClaimsError extends Error {
  constructor(
    public readonly eventType: CaepEventType,
    public readonly missing: string[],
  ) {
    super(
      `Cannot build ${eventType} event: missing required claim(s) ${missing.join(", ")}`,
    );
    this.name = "MissingCaepClaimsError";
  }
}

// Shared claim builder (caepRequiredClaims() from the architecture doc).
// Validates required claims are present and shapes the CAEP event object.
// Throws MissingCaepClaimsError rather than silently sending an
// ISC-rejectable event.
export function buildCaepEvent(input: CaepEventInput) {
  const required = CAEP_REQUIRED_CLAIMS[input.type];
  const missing = required.filter((key) => !(key in input.claims));
  if (missing.length > 0) {
    throw new MissingCaepClaimsError(input.type, missing);
  }

  return {
    [caepEventTypeUri(input.type)]: {
      subject: {
        format: "email",
        email: input.subjectEmail,
      },
      event_timestamp: Math.floor(Date.now() / 1000),
      ...input.claims,
      ...(input.vendor ? { vendor: input.vendor } : {}),
      ...(input.vendorEventType ? { vendor_event_type: input.vendorEventType } : {}),
      ...(input.recommendedAction ? { recommended_action: input.recommendedAction } : {}),
      // CONFIRMED 2026-07-28 against a real ISC tenant: reason_admin/
      // reason_user are NOT plain strings -- the OpenID CAEP spec's own
      // example shows them as localized objects (language code -> string),
      // e.g. { "en": "..." }. Sending a bare string produced ISC's parser
      // error "could not JSON decode claim" and the whole event was
      // rejected before ever reaching a Workflow. CaepEventInput keeps
      // these as plain strings for a simple caller API; wrap here.
      ...(input.reasonAdmin ? { reason_admin: { en: input.reasonAdmin } } : {}),
      ...(input.reasonUser ? { reason_user: { en: input.reasonUser } } : {}),
    },
  };
}
