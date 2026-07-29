# Design prompt: Threat Signal Transmitter — Simulator UI

Paste this into Claude Design along with the reference screenshot of a
teammate's "Simulate a vendor event" portal (same idea, more vendors and
extra chrome — we are intentionally building a smaller, core-only version
first; see "What NOT to include" below).

## What this app is

A single-tenant internal tool for one Solutions Engineer (me) to trigger
real, signed CAEP security signals against one already-configured SailPoint
ISC tenant (`company21912-poc`), so a demo audience watches ISC
automatically remediate (disable accounts, open a certification campaign)
in real time. The backend that actually signs and sends these signals is
already built and proven — this prompt is only for the UI layer in front of
it.

## Core pages (build only these three)

### 1. Simulator (the main/default page)

A 3-step vertical form, left-to-right or top-to-bottom:

**Step 1 — Source Alert**
- A vendor picker: exactly 5 tiles, no more — **CrowdStrike, Microsoft,
  Okta, Proofpoint, Jamf**. Each tile shows the vendor name and a short
  colored badge/initials, similar to the reference screenshot's vendor
  grid, but capped at these 5.
- Once a vendor is picked, an "Event" dropdown appears showing only that
  vendor's scenarios (e.g. CrowdStrike has 3: "Host Isolated", "Host
  Isolated (Device Compliance)", "Identity Compromise Detected"). 15
  scenarios total across the 5 vendors.

**Step 2 — Subject**
- One field: subject email (e.g. `Jayme.Cannon@sailpointdemo.com`), a plain
  text input. No subject-ID-format picker/dropdown — this tenant is fixed
  to email-based correlation, so there's nothing to choose here. (This is a
  deliberate simplification vs. the reference screenshot, which supports
  multiple tenants/formats — we don't need that yet.)

**Step 3 — Response / what will happen**
- A read-only summary showing which CAEP type this scenario maps to, which
  real, already-built ISC Workflow will fire, and what that Workflow's
  SailPoint action actually does. Source all three from the canonical
  per-scenario matrix below — never invented per-scenario, always looked up:

  | Vendor | Event | CAEP Type | Workflow | SailPoint Action | Status |
  |---|---|---|---|---|---|
  | CrowdStrike | Host Isolated | risk-level-change | SSF Injector Demo - Remove Access When Risk Level Changes | Disable access to the PRISM application | ✅ Live & proven |
  | CrowdStrike | Host Isolated (Device Compliance) | device-compliance-change | SSF Injector Demo - Remove Access on Device Non-Compliance | Disable access to the PRISM application | ✅ Live & proven |
  | CrowdStrike | Identity Compromise Detected | risk-level-change | SSF Injector Demo - Remove Access When Risk Level Changes | Disable access to the PRISM application | ✅ Live & proven |
  | Microsoft | High-Risk User Flagged | risk-level-change | SSF Injector Demo - Remove Access When Risk Level Changes | Disable access to the PRISM application | ✅ Live & proven |
  | Microsoft | Session Hijack Detected | session-revoked | SSF Injector Demo - Remove Access + Certify When Session Revoked | Disable access to the PRISM application and Active Directory, create certification campaign | ✅ Live & proven |
  | Okta | Credential Reset | credential-change | SSF Injector Demo - Remove Access + Certify When Credential Changes | Disable access to the PRISM application and Active Directory, create certification campaign | ✅ Live & proven |
  | Okta | MFA Unenrollment | credential-change | SSF Injector Demo - Remove Access + Certify When Credential Changes | Disable access to the PRISM application and Active Directory, create certification campaign | ✅ Live & proven |
  | Okta | Session Revoked | session-revoked | SSF Injector Demo - Remove Access + Certify When Session Revoked | Disable access to the PRISM application and Active Directory, create certification campaign | ✅ Live & proven |
  | Proofpoint | DLP Violation | risk-level-change | SSF Injector Demo - Remove Access When Risk Level Changes | Disable access to the PRISM application | ✅ Live & proven |
  | Proofpoint | TAP Malicious Click | risk-level-change | SSF Injector Demo - Remove Access When Risk Level Changes | Disable access to the PRISM application | ✅ Live & proven |
  | Proofpoint | Very Attacked Person (VAP) Flagged | risk-level-change | SSF Injector Demo - Remove Access When Risk Level Changes | Disable access to the PRISM application | ✅ Live & proven |
  | Jamf | Device Non-Compliant | device-compliance-change | SSF Injector Demo - Remove Access on Device Non-Compliance | Disable access to the PRISM application | ✅ Live & proven |
  | Jamf | Device Returned to Compliance | device-compliance-change | SSF Injector Demo - Remove Access on Device Non-Compliance | (correctly does not fire — reverse direction) | N/A by design |
  | Jamf | Management Status Lost | device-compliance-change | SSF Injector Demo - Remove Access on Device Non-Compliance | Disable access to the PRISM application | ✅ Live & proven |
  | Jamf | Required Security Tool Missing | device-compliance-change | SSF Injector Demo - Remove Access on Device Non-Compliance | Disable access to the PRISM application | ✅ Live & proven |

  This is fixed and 1:1 with CAEP type for the "SailPoint Action" column,
  per the "one Workflow per CAEP type, not per vendor" design decision
  (runbook Section 7 item 5) — every scenario of a given CAEP type shows the
  same action regardless of vendor. Implement this as a small constant
  (e.g. `SCENARIO_STATUS: Record<scenarioKey, { workflowName, action,
  status }>`) that both the catalog and the UI import, so it's defined
  once, not duplicated per scenario. `token-claims-change` has a live
  Workflow ("Create a Certification Campaign When Token Claims Change") but
  no catalog scenario maps to it anymore (dropped in favor of Jamf, runbook
  Section 3.17) — leave it out of the UI's scenario list, it's historical.

**Right-hand panel**
- A live JSON preview of the CAEP event claims that will be sent, updating
  as Step 1/2 selections change (before sending).
- A prominent "Send signal" button below/near the preview.
- After sending: show the real HTTP result (status code, success/fail) and
  a short "check ISC's Event Log for Correlated status" hint — don't fake
  or simulate this response, it's a real API call.
- Optional small callout (borrowed from the reference screenshot's "Demo
  note"): something like "The vendor catalog above is static, curated
  data — nothing here calls a real vendor API. The SailPoint side is real:
  this sends an actual signed token to your configured ISC receiver."

### 2. History

A simple table, most recent first: timestamp, vendor, event/scenario name,
subject email, HTTP status, success/fail. Read-only. This is the AuditLog
table already recorded by every send — just needs to be listed.

### 3. Credentials

A read-only info panel showing this tenant's current Discovery URL and a
masked/partial API token, with a copy button for each. No "create new
tenant" flow yet — provisioning a tenant is still a one-time CLI step, this
page just displays what's already configured. Include a one-line reminder
of where to paste the Discovery URL in ISC (Admin → Connections → Shared
Signals).

## What NOT to include (explicitly out of scope for this pass)

- No multi-tenant switcher, no per-user branding/avatar in the sidebar —
  single tenant, single user.
- No Settings or Account pages.
- No subject-ID-format dropdown (see Step 2 above).
- No "Admin catalog" editor (add/edit vendor scenarios via UI) — the
  catalog is still edited by changing `lib/catalog.ts` and redeploying.
  This is a real, acknowledged gap, but explicitly not part of this build.
- No scheduler/countdown/queued sends, no saved-identity picker beyond a
  single plain text field, no companion-Workflow-JSON download button.
- Don't try to match the reference screenshot's vendor count (8+) or its
  extra nav items — we have 5 vendors/15 scenarios/3 pages, on purpose,
  for now.

## Visual tone

Match the reference screenshot's general feel — clean, muted warm
neutral background, a left sidebar nav, card-style sectioned panels with
small uppercase section labels ("01 SOURCE ALERT" etc.), a dark
terminal-style payload preview panel. Simpler is better than matching it
feature-for-feature.

## Data model reference (for whoever implements this after Claude Design)

- Vendor scenarios: `lib/catalog.ts` — `VENDOR_SCENARIOS`, keyed by scenario
  ID, each with `vendor`, `displayName`, `triggerCode`, and an `event` object
  (CAEP type + claims).
- Sending a signal: `lib/ssf.ts`'s `sendSsfSignal()` — needs a stream ID,
  the scenario's event data, and a subject email.
- History: `AuditLog` Prisma model — one row per send attempt.
- Credentials: `Tenant`/`Stream` Prisma models hold the discovery
  slug/API token/stream info already provisioned for `company21912-poc`.
