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

export interface CaepEventInput {
  type: CaepEventType;
  subjectEmail: string;
  claims: Record<string, unknown>;
  vendorContext?: Record<string, unknown>;
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
      ...(input.vendorContext ? { vendor_context: input.vendorContext } : {}),
    },
  };
}
