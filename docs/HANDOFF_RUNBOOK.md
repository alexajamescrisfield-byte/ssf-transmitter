# Threat Signal Transmitter (TST) — Handoff Runbook

**Date of this handoff:** 2026-07-27 (last substantively updated
2026-07-30 — see Sections 3.21-3.25 for this session: the Admin Overview
dashboard + DB-backed vendor catalog (closing the last "minimum viable SE
surface" gap), a typo-proofing pass on the Add-vendor form plus a real fix
for `token-claims-change` scenarios, branded HTML emails on all 3
certification-campaign Workflows, signing keys fully migrated to Supabase
Vault (plaintext column dropped, live-verified), and multi-tenant support
(Tenant Configuration Panel, a tenant switcher, and a cross-tenant Overview
tile) — all deployed to production and merged to `main`.)
**Repo:** https://github.com/alexajamescrisfield-byte/ssf-transmitter (Public)
**Live deployment:** https://ssf-transmitter-chi.vercel.app
**ISC tenant used for testing:** `company21912-poc` (admin console: https://company21912-poc.identitynow-demo.com/)

---

## 1. Project Objective

Build a **hosted SSF (Shared Signals Framework) transmitter** — codenamed the
**Threat Signal Transmitter (TST)** — that lets Solutions Engineers inject
simulated vendor security alerts (CrowdStrike, Microsoft, Okta, Proofpoint,
Zscaler) into a SailPoint Identity Security Cloud (ISC) tenant as signed CAEP
Security Event Tokens (SETs), so that a live demo audience can watch ISC
automatically perform a Zero Trust remediation action (e.g. disabling an
account) in real time, without touching any real vendor APIs.

**Origin and phase history** (this superseded an earlier, unworkable design):

1. **Original PRD** ("Shipwright's Corner - Tack 1") specified a Python
   desktop `.exe` that would POST simulated signals into an ISC "Shared
   Signals webhook."
2. **Go/No-Go assessment** determined this was architecturally impossible:
   SailPoint ISC's SSF Receiver is *receiver-initiated* — it discovers and
   connects OUT to a transmitter's public discovery/JWKS/stream-management
   endpoints. A local, unreachable desktop process cannot satisfy this. No
   inbound "webhook" exists for a transmitter to push into on ISC's side.
3. **`How to Build the SSF Transmitter.md`** (architecture recommendation
   doc, post-NO-GO) specified the replacement design: a hosted, multi-tenant
   Next.js SaaS transmitter with a thin SE portal on top, built in 4 phases
   (Phase 0: prove the protocol; Phase 1: harden; Phase 2: demo
   completeness/UI; Phase 3: SE org scale).
4. **`ARD SSF Injector.docx`** — formal Architecture Requirements Document,
   generated from the design doc, used as the working spec for this build.
5. **This session** built and proved **Phase 0** end-to-end against a real
   ISC tenant, plus a first working companion Workflow (which is part of
   Phase 2's "Demo Completeness" scope, pulled forward because it was the
   natural next step to prove the *value* of Phase 0, not just its plumbing).

---

## 2. Current Status

**Phase 0: COMPLETE. Phase 1: COMPLETE.** (both confirmed 2026-07-28 — see
Section 2.2 for the reasoning on Phase 0, and the integration test harness
added today for Phase 1.)

**Phase 0 gate: PROVEN, end-to-end, against a real ISC tenant.**

A real, live test was completed successfully:
- A signed `risk-level-change` SET was sent for a real identity
  (`Jayme.Cannon@sailpointdemo.com`) in the `company21912-poc` tenant.
- ISC received it, correlated it to her identity ("Correlated" status in
  the Event Log), and fired a native CAEP Workflow trigger.
- That Workflow automatically **disabled her PRISM account** — confirmed
  visually in ISC's UI. No manual intervention.

This is the actual substance of what the whole project was building toward.

**What is NOT yet done:** the ISC admin UI's own "Verify Stream" button
still fails (see Section 7). This does **not** block real signal delivery —
proven working regardless — but it's an unresolved rough edge, and a
SailPoint support case is drafted but not yet submitted.

**UPDATE 2026-07-29 (later in the day): a real SE-facing UI now exists.**
See Section 3.18 — a Simulator/History/Credentials UI is built, deployed to
production, and proven end-to-end (real send → correlate → Workflow fire →
account state change) both locally and on the live Vercel deployment. This
was the single largest gap in the project relative to its stated purpose
("lets Solutions Engineers inject...", not developers running scripts) --
it is now closed. The paragraph below describes the state as of earlier in
the day, before this UI existed; kept for historical accuracy of how the
day progressed, not because it's still true.

**UPDATE 2026-07-30: multi-tenant support now exists, and the "minimum
viable SE surface" is fully complete.** See Sections 3.21-3.25. The portal
is no longer wired to exactly one hardcoded ISC tenant — an Admin >
Tenants panel lets an operator provision additional tenants through the
UI (no more CLI-only provisioning), and a switcher lets Simulator/
History/Credentials operate on whichever tenant is selected. The Admin
catalog piece (the one item still open as of Section 7 item 6) is also
now done: vendor/event scenarios live in Postgres and can be added
through the UI without a code change or redeploy. Signing keys are fully
migrated to Supabase Vault with the old plaintext column dropped
(Section 3.24) — the project's last remaining "not production-grade yet"
flag on Definition-of-Done criterion 1 (Section 2.1) is resolved.

**No SE-facing UI exists yet [as of early 2026-07-29].** All testing so far
has been done via command-line scripts run by the developer, not by an SE
clicking buttons. That's Phase 2 work, not started.

### 2.1 "Definition of Done" — status against `How to Build the SSF Transmitter.md`

That source document defines exactly what "done" means for this project.
**UPDATE 2026-07-30: 4 of 5 criteria are now fully done; the 5th is
permanently, externally blocked (not something further work will fix).**

| Definition-of-done criterion | Status |
|---|---|
| Provision a tenant in the portal | **DONE (2026-07-30)** — Admin > Tenants panel (Section 3.25) provisions a tenant through the UI, no CLI required. The CLI script (`scripts/provision-tenant.ts`) still exists and still works, kept for scripting convenience, but is no longer the only path |
| Wire SailPoint ISC via Discovery URL + API token | **Done** |
| Pass Verify Connection | **Permanently blocked, not "not done"** — this is the unresolved `/ssf/verify` issue (Section 7, item 1). Confirmed with the user (2026-07-29): no SailPoint support case will be filed for this; don't resurface it as a next step. Real signal delivery (proven repeatedly, every session) is stronger evidence of a working transmitter than this synthetic handshake would be anyway (Section 2.2) |
| Send at least 3 CAEP types from realistic vendor stories | **DONE (2026-07-29)** — see detail below the table |
| Show a Workflow remediation in ISC | **Done** — PRISM account disable, confirmed live (2 CAEP types); certification campaign remediation confirmed live for the 3rd (see below) |

**(2026-07-28) "Send at least 3 CAEP types" — detailed status:**
- **`risk-level-change` (Okta)** — fully proven: signal → correlated → Workflow fired → PRISM disabled. Confirmed multiple times.
- **`device-compliance-change` (Jamf)** — fully proven, same complete chain, confirmed 2026-07-28 (Section 3.10).
- **`token-claims-change` (Zscaler)** — as of 2026-07-28, signal delivery, correlation, and Workflow **triggering** were proven, but the remediation step (`Create Certification Campaign`) failed with a reproducible ISC error. **RESOLVED 2026-07-29 — see Section 3.14.** The real root cause was found and fixed (not a platform bug after all): the native action's `reviewerCertificationType: "ACCESS"` branch always builds an unconstrained, tenant-wide search query, which is what exceeded the 10,000-item guard. Switching to `reviewerCertificationType: "IDENTITY"` fixes it completely, using only native actions (no workaround, no external HTTP calls). Confirmed working end-to-end, including a real notification email delivered.

**(2026-07-29) Updated bottom line**: all 3 CAEP types now have the **full** chain proven — signal → correlate → trigger → real remediation executed — with zero remaining gaps attributable to an ISC platform bug. What looked like a platform bug on 2026-07-28 turned out to be a fixable Workflow misconfiguration; see Section 3.14 for the full story. This closes criterion 4 outright, not provisionally.

**Bottom line, updated 2026-07-30:** 4 of 5 definition-of-done criteria are now fully met outright (Provision a tenant in the portal, Wire ISC, Send ≥3 CAEP types, Show a Workflow remediation). The 5th (Verify Connection) is permanently, externally blocked — not partial, not pending further work, tracked separately and not expected to ever close (Section 5's 2026-07-29 note on the decision not to file a SailPoint support case for it). Do not treat this project as complete based on Section 2's "Phase 0 gate: PROVEN" framing alone — that refers to the *protocol* working, which is necessary but not sufficient for the actual definition of done in the source document. See Sections 7 and 9 for exactly what's left.

**(2026-07-28) Clarification, decided explicitly with the user:** the "NOT done"/partial rows do **not** mean Phase 0 or Phase 1 are incomplete — see Section 2.2. They mean the project-level Definition of Done is a separate, still-open finish line. Verify Connection is tracked as an external, non-blocking issue (support case) — and the token-claims-change campaign-generation bug is now tracked the same way (Section 7). Do not reinterpret or lower this bar — the criteria as the source document states them are unchanged; only our prioritization of *when*/*how* to finish them changed.

### 2.2 Is Phase 0/1 broken, or is this just Phase 2/3 not started yet?

Read this before concluding anything above needs to be "fixed" or
"gone back to." The distinction matters and is easy to blur:

- **(2026-07-28) Phase 0: CONFIRMED COMPLETE, not just "essentially"
  complete.** 4 of its 5 gate criteria (Section 2.1's source list) are done
  outright. The 1 remaining item (Pass Verify Connection) is not something
  done wrong — it's externally blocked on SailPoint's own connector
  behavior, already root-caused as far as possible, and handed off as a
  support case (Section 7, item 1). Explicitly decided with the user: the
  real signal pipeline (real signal → correlated → native Workflow fired →
  real remediation executed, repeated successfully multiple times) is
  *stronger* evidence of a working transmitter than the Verify handshake
  would provide even if it passed — Verify is a synthetic smoke test for
  exactly the thing we've already proven via the real functional path. So
  this is "waiting on an external answer, tracked separately," not "Phase 0
  isn't done."
- **(2026-07-28) Phase 1: CONFIRMED COMPLETE.** The one remaining gap as of
  2026-07-27 — the automated integration test harness (Section 7, item 9;
  Section 9.1, backlog item 8) — was built today: a Vitest suite
  (`tests/integration/`, run via `npm test`) covering discovery, JWKS,
  stream create/GET/PATCH, auth boundaries, and `sendSsfSignal()`/
  `sendVerificationSet()` claim shape, run against a local mock receiver
  that captures and decodes the actual signed SET bytes. 24 tests, all
  passing. Everything else in Phase 1's scope (stream status gating,
  preferring the registered delivery URL) was already done and correct in
  the shipped code. "Preview = wire payload parity" remains not-applicable
  until Phase 2's Simulator UI exists to have parity with — that's a
  sequencing property of the source doc's own phase ordering, not a Phase 1
  shortfall.
- **Everything else the audit surfaced — the event-model/catalog design,
  the entire Simulator UI, all of Phase 3 — is *not* a Phase 0/1 mistake.**
  It is Phase 2 and Phase 3 scope that correctly has not been started yet,
  per the source doc's own explicit sequencing: *"3) SE experience (demo
  UX only — after protocol works)."* Protocol was built first, proven
  working, and the UI/catalog/org-scale work comes next by design — this
  session simply hadn't documented that pending work in writing until the
  audit prompted it. **The audit found a documentation gap, not an
  implementation gap**, with the one exception of the test harness noted
  above.

---

## 3. Completed Work

### 3.1 Architecture assessment & design docs
- Confirmed via SailPoint's own documentation
  (`documentation.sailpoint.com/saas/help/shared_signals/index.html` and
  `.../managing_receivers.html`) and the OpenID Shared Signals Framework
  1.0 Final spec that the desktop-webhook PRD design was infeasible.
- Revised `SailPoint_SSF_Transmitter_Design.docx` to v2.0 reflecting the
  hosted-transmitter architecture.
- Reviewed `ARD SSF Injector.docx` and confirmed the built code matches it
  section-by-section.

### 3.2 Application scaffolding
- Scaffolded a Next.js (App Router, TypeScript) project named
  `ssf-transmitter` under `SSF Signals Portal Projects/ssf-transmitter`.
- Added Prisma ORM, `jose` (JWT signing), `pg` + `@prisma/adapter-pg`
  (Postgres driver adapter — Prisma 7 requires a driver adapter, no
  built-in engine).
- Data model (`prisma/schema.prisma`): `Tenant`, `SigningKey`, `Stream`,
  `AuditLog` — see Section 4 for details.

### 3.3 Protocol core (the actual SSF transmitter surface)
Built and deployed all five endpoints ISC calls directly, per-tenant via a
`/t/{slug}/...` path convention:

| Endpoint | Method(s) | Purpose |
|---|---|---|
| `/.well-known/ssf-configuration` | GET | Discovery document |
| `/.well-known/jwks.json` | GET | Public signing key |
| `/ssf/streams` | GET, POST, PATCH | Stream create/list/refresh |
| `/ssf/status` | GET, POST | Stream status check/set |
| `/ssf/verify` | POST | Connection verification handshake |

Plus internal library code (`lib/`) for signing, claim-building, and
authentication — see Section 4.

### 3.4 Deployment infrastructure
- **GitHub:** pushed to `github.com/alexajamescrisfield-byte/ssf-transmitter`.
  Had to be set to **Public** — Vercel's free Hobby plan blocks deployments
  from "unrecognized" commit authors on **private** repos ("Hobby Plan does
  not support collaboration for private repositories"); public repos don't
  hit this restriction.
- **Vercel:** deployed at `ssf-transmitter-chi.vercel.app`. Build script is
  just `next build` — **does NOT run `prisma migrate deploy` automatically**
  (see Section 7/8, this was a deliberate fix after it hung the build).
- **Supabase:** Postgres database. Two different connection strings matter:
  - **Transaction pooler** (port `6543`) — used for normal app runtime
    (`DATABASE_URL` in Vercel env vars and local `.env`).
  - **Session pooler** (port `5432`) — required for running
    `npm run migrate` (`prisma migrate deploy`); the Transaction pooler
    hangs indefinitely on migrations because it doesn't support the
    persistent connection Prisma Migrate needs.
  - "Automatically expose new tables" was **disabled** in Supabase — this
    app talks to Postgres directly via Prisma, not via Supabase's Data API,
    and tables here hold private signing keys and API tokens that must
    never be exposed through a public REST/GraphQL layer.

### 3.5 Local Postgres proof, then real ISC integration debugging
Extensive iterative debugging against the real `company21912-poc` ISC
tenant. Every fix below was root-caused from an actual ISC error message or
Vercel request log — not guessed blindly (with one exception noted, the
`/ssf/verify` response shape, which remains unresolved after ~6 attempts).

Bugs found and fixed, in the order discovered:
1. **Wrong delivery method URI** — discovery doc advertised
   `https://schemas.openid.net/secevent/risc/delivery-method/push`; ISC
   required the exact IETF URN `urn:ietf:rfc:8935`.
2. **`iss` mismatch on stream creation** — POST `/ssf/streams` response
   returned the bare tenant slug (`"company21912-poc"`) instead of the full
   issuer URL from the discovery document. ISC compares these
   byte-for-byte.
3. **Missing `status` field** — stream creation response didn't include
   `status`, which gated ISC's "Verify Stream" UI button
   ("available once stream status is enabled").
4. **405 on `PATCH /ssf/streams`** — ISC's "enable stream" action sends
   `PATCH` to the streams collection endpoint (not `POST /ssf/status` as
   assumed); only `GET`/`POST` were implemented. Added `PATCH`.
5. **Wrong `PATCH` body assumption** — ISC's `PATCH` body is the *full*
   stream config re-submitted as a periodic refresh (delivery, events, etc.)
   — it has **no `status` field at all**. Rewrote the handler to update
   whichever fields are present rather than requiring `status`.
6. **`"aud is empty"`** — `PATCH`/`GET` stream responses didn't include
   `aud`; added it consistently everywhere a stream is represented.
7. **`GET /ssf/status` 405** — ISC's status-check flow calls `GET` before/
   instead of `POST`; only `POST` existed. Added `GET`.
8. **`subject is required`** (found via ISC's **Event Log**, not the popup) —
   the signed SET's `verification` event had no `subject` claim at all.
   Added one (email format placeholder).
9. **Still `subject is required`** even with a nested `subject` — per the
   actual OpenID SSF spec Section 3.1 (fetched and quoted directly), the
   claim must be named **`sub_id`** and live at the **top level of the JWT**,
   not `subject`, not nested inside the event. Fixed in `lib/ssf.ts` for
   both `sendVerificationSet()` and `sendSsfSignal()`.
10. **Missing `aud` claim on the signed SET itself** (not just HTTP
    responses) — added `.setAudience(...)` to both JWT-signing call sites.
11. **`current_level: "high"` rejected** — real signal test (not the verify
    handshake) failed parsing: `invalid current level`. Per the OpenID CAEP
    spec, valid enum values are uppercase (`"LOW"`, `"HIGH"`, etc.), not
    lowercase. Fixed in the test script.
12. **Expired delivery credential ("JWT is expired", 401)** — root cause:
    ISC issues a short-lived (~48hr) bearer token in
    `delivery.authorization_header` when a stream is created, and refreshes
    it periodically via its own "token rotation workflow" calling
    `PATCH /ssf/streams`. The `PATCH` handler updated `deliveryEndpointUrl`
    and `eventsRequested` from the request body but **never captured
    `authorization_header`**, so the original token was used forever until
    it expired. Fixed by adding `authorization_header` capture to the
    `PATCH` handler. **Existing streams created before this fix still hold
    a stale token and must be recreated to get a working one** (this is
    what happened in this session — see Section 9).

### 3.6 ISC-side manual configuration (done via ISC's admin UI, by the human operator — not via API)
- Created an SSF **Receiver** named "Threat Signal Transmitter" (later a
  second one, "Threat Signal Transmitter v2", after the original stream's
  credential expired).
- Configured **API Token** authentication, **Discovery URL**, event type
  **Risk Level Change**, **Subject ID Format** = "Use the identity's email
  attribute" (default).
- Created a **Stream** under that Receiver.
- Confirmed via a real API probe (see Section 3.7) that the
  `company21912-poc.identitynow-demo.com` `.env.local` API client has
  `ORG_ADMIN` authority and *could* do this programmatically, but this was
  deliberately **not** used for write actions — every ISC-side change in
  this session was made manually via the UI, both so a real human stays in
  control of a real tenant, and because the whole point of this project is
  that other SEs need to be able to do this themselves by hand.

### 3.7 Real identity lookup (read-only API use)
- Used the OAuth client credentials already present in
  `C:\Users\delga\OneDrive\Documents\company21912\.env.local`
  (`CLIENT_ID`/`CLIENT_SECRET`) to call ISC's `/v3/public-identities` API
  and find a real test identity: **Jayme Cannon**
  (`Jayme.Cannon@sailpointdemo.com`), the only reliably-emailed identity
  checked. This was a **read-only** lookup.
- Separately confirmed (also read-only) that this same API client is
  scoped `ORG_ADMIN` — capable of far more than reads, but has not been
  used for writes per the policy established with the user (see Section 5).

### 3.8 Companion ISC Workflow
- Used the pre-built ISC template **"Remove Access When Risk Level
  Changes"** (found under Workflows → Threat Detection templates) rather
  than building from scratch. Trigger: `CAEP Risk Level Change Events`.
  Steps: `Get Identity` → `Get Identity's Accounts` → `Disable Accounts` →
  End.
- **Scoped the blast radius**: by default this template disables *all* of
  an identity's accounts across *all* sources. Deliberately narrowed to
  **PRISM only** (excluding Active Directory, IdentityNow, and HR) by
  editing the `Disable Accounts` step's "Select Accounts" field from:
  ```
  $.getAccounts.accounts[*].id
  ```
  to:
  ```
  $.getAccounts.accounts[?(@.sourceId=="8c63bd999dd74afcb4e344ba0466ae9b")].id
  ```
  (`8c63bd999dd74afcb4e344ba0466ae9b` = PRISM's source ID in this tenant,
  found via its Admin UI URL). **HR was deliberately excluded** because
  it's an authoritative source-of-record for employment data, not an
  access system — disabling an account there is semantically wrong for a
  security-remediation action.
- **Discovered the workflow is created in a DISABLED state by default** —
  it must be manually toggled to Enabled from the Workflows list view
  before it will actually fire. This is easy to miss and must be called
  out explicitly in any onboarding doc.
- After enabling, re-ran the real signal test: **PRISM account for Jayme
  Cannon was automatically disabled**. Confirmed visually in her Accounts
  tab. This is the full pipeline proof described in Section 2.

### 3.9 Verification of the actual trigger payload
Discovered (documented for reuse): **ISC Event Log → Actions ("...") →
View Details** shows the exact JSON payload a Workflow trigger received,
including `correlatedID` (proof of how ISC matched the subject),
`identityAttributes` (the identity data pulled in), the original `ssfEvent`
(our decoded SET), and `streamName`. Useful for debugging or for showing a
technical audience "here's the real match" during a demo.

### 3.10 Catalog data structure and `device-compliance-change` Workflow (2026-07-28)
- Built `lib/catalog.ts`: the actual `vendor`/`displayName`/`triggerCode`/
  `ssfEventType`/claims catalog structure the source doc asked for
  (Section 7 item 6's gap). 5 scenarios, one per CAEP type: Okta
  (`risk-level-change`), Microsoft (`credential-change`), Jamf
  (`device-compliance-change`), Proofpoint (`session-revoked`), Zscaler
  (`token-claims-change`) — using spec-confirmed enum values for each
  type's required claims (fetched directly from the OpenID CAEP spec, not
  guessed).
- Built `scripts/send-scenario.ts`: sends any catalog scenario by key
  against a real stream; lists all 5 if run with no arguments.
- **Jamf chosen for `device-compliance-change`** over the originally-
  planned CrowdStrike, after comparing against a real peer's vendor-event
  catalog UI (see Section 3.13) — Jamf is the most literal, unambiguous
  fit (MDM/device-compliance is its entire product category).
- **Built the `device-compliance-change` companion Workflow via direct API
  calls** (`scripts/create-device-compliance-workflow.ts`), not the UI —
  same proven 3-step shape as the `risk-level-change` Workflow (`Get
  Identity` → `Get Identity's Accounts` → `Manage Accounts`, PRISM-only
  scoped from the start), trigger `idn:caep-device-compliance-change-events`.
  Found the exact trigger IDs for all 5 CAEP types via a
  previously-undocumented endpoint, `GET /beta/triggers` (see Section
  10.5) — no guessing needed.
- **Bug found and fixed**: the initial `POST /beta/workflows` call used
  the wrong trigger-filter attribute key (`filter` instead of the
  JSONPath-reference convention `filter.$`), so the created Workflow had
  **no filter at all** and would have fired on every device-compliance
  event, not just `not-compliant` ones. Fixed via
  `scripts/fix-device-compliance-trigger-filter.ts` (disable → patch
  `trigger.attributes` → re-enable, same pattern as Section 7 item 5's
  fix). Confirmed correct afterward via `GET /beta/trigger-subscriptions`
  (also previously undocumented — lists every Workflow's live trigger
  registration, filter included).
- **Confirmed working end-to-end**: real signal → correlated → Workflow
  fired → PRISM disabled, confirmed via `scripts/check-prism-account.ts`
  showing `disabled: true` at the exact execution timestamp. This is CAEP
  type #2 fully proven (Section 2.1).

### 3.11 `reason_admin`/`reason_user` claim-shape bug (2026-07-28)
- Added `reasonAdmin`/`reasonUser` as proper optional fields to
  `lib/caep.ts`'s `CaepEventInput`/`buildCaepEvent()` — these are
  *official* CAEP schema claims (present on every event type per spec),
  unlike `vendor`/`vendor_event_type`/`recommended_action`, so unlike
  those, they're the legitimate way to carry human-readable narrative
  context through to a Workflow.
- **Bug**: initially implemented as plain strings. The first real
  `device-compliance-change` send with `reason_admin` set was **rejected
  outright** by ISC's parser: `"failed to parse token: token is malformed:
  could not JSON decode claim"` — the whole event failed, never reaching
  correlation or the Workflow at all.
- **Root cause, found by reading the OpenID CAEP spec's own literal
  example JSON** (not a summary): `reason_admin`/`reason_user` are
  **localized objects** (`{ "en": "..." }`), not plain strings. Fixed in
  `lib/caep.ts` — the `CaepEventInput` type keeps them as plain strings
  for a simple caller API, wrapped as `{ en: value }` when building the
  event object. Covered by a new regression test
  (`tests/integration/send-signal.test.ts`).
- Retested after the fix: `device-compliance-change` signal with
  `reason_admin` correctly shaped now delivers and fires the Workflow
  successfully.

### 3.12 `token-claims-change` Workflow and the certification-campaign bug (2026-07-28)
- Built via the ISC UI (not API, deliberately — Section 3.12.1 explains
  why), from the native template **"Create a Certification Campaign When
  Token Claims Change"**: `Get Identity` → `Get Identity's Manager` →
  `Create Certification Campaign` (Manager as Individual reviewer, Access
  Certification / Entitlement / "Certify all access", 30-day duration) →
  `Send Email` (notifies the manager, correctly templated with live
  workflow data) → End. No validation errors; user confirmed **Enabled**.
- **Found via the live trigger subscription** (not guessed): this
  template's default filter requires `initiating_entity == "policy"` —
  `lib/catalog.ts`'s Zscaler scenario didn't set this at all and was
  fixed to include it, confirmed correct per the OpenID CAEP spec's own
  `token-claims-change` example.
- **Real signal sent successfully, Workflow fired correctly** —
  `Get Identity`/`Get Identity's Manager` both completed correctly using
  live data (Jayme Cannon, manager Martena Heath). This is proof the
  signal-to-trigger path works for a 3rd CAEP type.
- **`Create Certification Campaign` step fails, reproducibly, twice**:
  ISC's own error, via the real execution history endpoint
  `GET /beta/workflow-executions/{id}/history` (see Section 10.5 — a
  previously-undocumented, working endpoint found after several 404s on
  guessed paths): `"campaign id: <id> has error status (type: Campaign
  creation failed, retryable: false)"`. Two attempts, two different
  campaign IDs, same error both times — not transient.
- **Ruled out as a data problem**: checked Jayme Cannon's actual
  entitlements directly in ISC's UI — she has 5 real entitlements (all
  Active Directory-sourced). The campaign wasn't failing on an empty
  certification scope.
- **Isolated via a manual A/B test — this is the key finding**: built an
  *identical* campaign by hand through ISC's own Certifications UI (same
  target identity, same Individual reviewer = Martena Heath, same "Certify
  all access" scope, same settings) — **it generated successfully**, no
  error. This proves the campaign type/configuration itself is valid and
  supported in this tenant; the failure is specific to how the Workflow's
  `sp:create-campaign` action (`sp:create:campaign:v2` per the error's
  activity type) calls the same underlying API. Likely candidate, unverified:
  the Workflow's request sends `"recommendationsEnabled": null` where the
  backend may require literal `false`, or `"query": "*"` /
  `"accessConstraints": {"ids": ""}` shaped differently than what the
  manual UI flow sends — but this can't be confirmed without seeing the
  manual flow's actual API request, which isn't visible from the UI. This
  is a strong support-case candidate: **not yet submitted**.

### 3.14 `token-claims-change` certification-campaign bug — real root cause found and fixed (2026-07-29)

**This supersedes Section 3.12's "platform bug" conclusion.** What looked
like an unfixable ISC platform bug on 2026-07-28 (Section 3.12, Section 7
item 14) turned out to be a fixable Workflow misconfiguration, found via
a second look prompted by a real ISC error message the user had
independently seen: *"Certification campaign from Search exceeded 10000
access items. Create a new campaign with fewer access items."*

**Investigation, in order:**
1. **Inspected the live Workflow's raw JSON** (`scripts/get-workflow.ts`)
   and found a dangling, unresolvable attribute on the `Create
   Certification Campaign` step: `"reviewerAccessConstraintIds.$":
   "$.getAccess.accessItems"` — referencing a `Get Access` step that
   didn't exist anywhere in the Workflow. Removed it
   (`scripts/fix-token-claims-campaign-scope.ts`) and retested — **no
   change**. Same failure.
2. **Captured the actual HTTP request body** ISC's Workflow engine sends
   for `sp:create-campaign`, via `GET
   /beta/workflow-executions/{id}/history`'s `ActivityTaskScheduled`
   event. This was the real breakthrough — it showed the action
   unconditionally building:
   ```json
   "searchCampaignInfo": {
     "type": "ACCESS",
     "query": "*",
     "identityIds": "<the correct single identity ID>",
     "accessConstraints": { "ids": "", "operator": "ALL", "type": "ENTITLEMENT" },
     "reviewer": { "id": "<correct manager ID>", "type": "REVIEWER_IDENTITY" }
   }
   ```
   Even though `identityIds` and `reviewer` were correctly populated with
   single-identity data, `searchCampaignInfo.type` was always `"ACCESS"`
   with `query: "*"` — an unconstrained, tenant-wide access-item search.
   This is what exceeds the 10,000-item guard, regardless of how small
   the *target identity's own* access actually is (Jayme Cannon has 6
   items total).
3. **Found the real fix by re-reading `sp:create-campaign`'s own schema**
   (`scripts/list-workflow-templates.ts`): the action has a
   `reviewerCertificationType` field with two branches — `"ACCESS"`
   (what the native template ships with, and what triggers the bug) and
   `"IDENTITY"` (a distinct, undocumented-in-the-UI-copy branch). Switched
   the step's attributes to use `reviewerCertificationType: "IDENTITY"`
   (dropping `reviewerAccessItemType`/`reviewerAccessOperator`, which only
   apply to the `ACCESS` branch) and retested via `POST
   /beta/workflows/{id}/test` (a genuine, real-execution test endpoint —
   confirmed via empirical probing that it is **not** a dry-run; it runs
   real actions with a synthetic trigger payload, useful for iterating on
   a disabled Workflow without needing a full signed-SET round-trip).
   **Result: the campaign was created successfully, status `STAGED`,
   correctly scoped to exactly the 1 target identity.** No error.
4. **Finalized**: set `activateUponCreation: true` (confirmed to work
   correctly on the `IDENTITY` branch — it had appeared inert when
   tested on the broken `ACCESS` branch, since that branch never got far
   enough to activate anything) and hardcoded the campaign name to
   `"Emergency Access Review"` (previously `.$`-mapped to the identity's
   display name) per a direct user request during this session. Retested
   end-to-end via `/test`: campaign created **`ACTIVE`** immediately, a
   real notification email was sent to and confirmed received by the
   manager (Martena Heath), Workflow completed with no errors. Re-enabled
   the Workflow for production use.

**Why this matters beyond just fixing the bug**: this is a genuine,
durable fix using only native SailPoint actions — no external HTTP calls,
no embedded credentials, no workaround layered on top of the platform.
The user explicitly rejected an earlier draft approach (an `sp:http`
step calling ISC's own `/v3/campaigns` API directly, which would have
required embedding OAuth client credentials in the Workflow's JSON
definition, visible to anyone with Workflow view/export access) —
correctly, since a same-tenant native-action fix existed and is strictly
better. **Lesson for future debugging**: when a native Workflow action
misbehaves, check for alternate configuration branches in the action's
own schema (`GET /beta/workflow-library`) before reaching for an external
HTTP-call workaround — the schema often has more than one path to the
same outcome, and one may avoid the bug entirely.

**One platform quirk confirmed along the way, worth knowing for future
Workflow debugging**: `sp:http`'s `url`/`urlParams` fields do **not**
support any form of string templating or path-token substitution — only
pure, full-value JSONPath (`"key.$": "$.some.path"`, must start with
`$`, no functions like `States.Format()`). This was empirically confirmed
via a disposable scratch Workflow (`SCRATCH - URL templating test (delete
me)`, safe to delete from the Workflows list) before it blocked what
would otherwise have been the fallback approach. If a future Workflow
needs to call an ISC endpoint with a dynamic path parameter (e.g.
`/v3/campaigns/{id}/activate`), check for a native action first — as
happened here with the newly-discovered `sp:activate-campaign` action
("Activate Certification Campaign", takes a plain `id` field, no URL
templating needed) — rather than assuming `sp:http` can do it.

**Real estate created in `company21912-poc` during this investigation**
(cleanup optional, all harmless): several throwaway `STAGED`/`ERROR` test
campaigns named "Jayme.Cannon" or "TEST ..." and two real, working
`ACTIVE` campaigns both named "Emergency Access Review" — one created
manually via a direct API script before the Workflow fix landed
(description mentions "for Jayme.Cannon" and "Zscaler"), one produced by
the actual fixed, automated Workflow (shorter description, no vendor
name) — both are legitimate, the second is the one to point to as proof
this works end-to-end automatically.

#### 3.12.1 Why this Workflow was built via the UI, not the API
Unlike the `device-compliance-change` Workflow (built via API once the
correct pattern was known), `Create Certification Campaign`'s underlying
action (`sp:create-campaign`) has a deeply nested, multi-branch config
schema (Reviewer Type: Manager/Individual/Governance Group, each with
different required sub-fields; Certification Type: Access vs. Identity,
each with further branches). The risk of misconfiguring this via blind
JSON construction was judged too high compared to the simple 3-step
disable pattern already built twice — so this one was built through the
actual template in the UI instead, which the ironic result of today's
session (a real platform bug in that exact action) suggests was the right
call: even a *correctly UI-configured* instance of this action fails.

### 3.13 Vendor-differentiation experiments (2026-07-28) — both negative, both conclusive
Two real, reasoned hypotheses were tested and disproven — recorded here so
neither gets re-attempted without new information:
- **Does ISC's trigger *filter* see custom claims, even though the
  Workflow's own input doesn't?** Tested directly: temporarily added
  `&& @.vendor == "Jamf"` to the `device-compliance-change` Workflow's
  filter, sent one signal with `vendor: "Jamf"` and one with a different
  vendor value. **Neither fired.** This proves custom-claim stripping
  happens *before* filter evaluation too, not just before the Workflow's
  `$.trigger` input — closing off per-vendor filtering via custom claims
  entirely, at every stage. Filter reverted to its original form
  immediately after the test (`scripts/test-vendor-filter.ts` does this
  automatically regardless of outcome).
- **Can a Workflow hardcode a vendor name in static text (e.g. an email
  body) truthfully?** A real ISC-generated email (screenshot reviewed,
  from a different context) said *"generated by the company's endpoint
  management system, JAMF"* as fixed prose. Confirmed this is legitimate
  **only** under a strict one-vendor-per-Workflow assumption — the
  Workflow's author already knows which vendor that Workflow represents
  at build time; it doesn't depend on anything in the signal. **Does not
  scale** if a second vendor is ever mapped to the same CAEP type (user
  caught this directly) — hardcoding would then be wrong for that second
  vendor's events, since there is no proven way (claim- or filter-based)
  for a Workflow to tell them apart at runtime.

### 3.15 Teammate's SSF Signals Portal payload: catalog merge + `sub_id` "complex" format investigation (2026-07-29)

A teammate working a separate, independent SSF transmitter build (different
app, different ISC tenant: `acme-demo`) shared their catalog export —
14 vendor scenarios across CrowdStrike/Microsoft/Okta/Proofpoint/Zscaler,
all correctly mapped onto the 5 supported CAEP types with correct
required-claim shapes per the OpenID CAEP spec.

**Decision: keep this project's own transmitter backend, don't switch to
theirs.** Our protocol layer (discovery, JWKS, streams, signing, delivery)
is already proven end-to-end against `company21912-poc` — re-platforming
onto an unproven, separate codebase would mean re-doing Phase 0/1 work for
no benefit. Their export was catalog **data**, not a reason to change
transmitters.

**Catalog merge**: their 14 scenarios were added to `lib/catalog.ts`
(19 scenarios total now, up from 5), using our own claim-building pipeline
— `sendSsfSignal()`/`buildCaepEvent()` were not modified. One scenario
(`crowdstrike-host-isolated`) was sent for real against `company21912-poc`
and confirmed to correlate and fire the existing `risk-level-change`
Workflow (PRISM disable) correctly, same as always. All 28 tests
(24 original + 4 new/adjusted) still pass.

**Safety process used for this work (per explicit user instruction to
never risk breaking a working build)**: committed the pre-merge state to
`main` first as a verified checkpoint (all tests passing), then did all
catalog-merge and experimentation work on a new `dev` branch. `main` stays
at the checkpoint until `dev` is explicitly merged.

**The `sub_id` "complex" format question — investigated, corrected, and
resolved:**

The teammate's export used a `sub_id`/`subject` shape our own transmitter
does **not** produce:
```json
"sub_id": { "format": "complex", "user": { "format": "email", "email": "..." } }
```
versus our own proven flat shape (`lib/ssf.ts`):
```json
"sub_id": { "format": "email", "email": "..." }
```

The teammate separately reported (unprompted, after seeing this project's
catalog-merge summary) that in **their own tenant**, they had to switch
from a flat email/account format to this "complex" wrapper to get a
correlated event to actually fire a Workflow trigger — and warned this
project would hit the same issue.

**First test (flawed) said "complex" doesn't work here — this was
wrong**, and the mistake is worth recording so it isn't repeated:
sent an isolated real signal (`scripts/test-complex-sub-id-format.ts`,
built standalone, doesn't touch `lib/ssf.ts`) using the complex `sub_id`
shape, checked for a new Workflow execution ~10-12 seconds later, saw
none, and initially concluded the format failed to correlate/trigger.
**This conclusion was wrong because the wait was too short.** The user
checked the Receiver's own Event Log directly in the ISC UI (no API for
this was found — `/beta/shared-signals*`, `/beta/receivers`,
`/beta/ssf*`, `/beta/sse-feed*` all 404, confirming this is UI-only,
same as Section 3.9's original finding) and showed the complex-format
signal had in fact correlated successfully (`Correlated` status). A
follow-up check of Workflow executions (this time with no time-boxing
assumption) found the trigger fired 30-60+ seconds after correlation —
well after the original short check window. **A second, fully isolated
test** (one signal, nothing else sent nearby, 60-second wait) confirmed
this cleanly: the complex format correlates and triggers the Workflow
correctly in `company21912-poc`, just like the flat format does.

**Corrected conclusion**: both `sub_id` shapes work in this tenant as
currently configured (Subject ID Format: "Use the identity's email
attribute"). There is no evidence either format is broken here. The
teammate's own described troubleshooting path (email format issues →
tried an account-based format → account correlated but "didn't fill out
all the information" → complex format fixed it) describes a materially
different starting problem than anything hit in this project — most
likely their tenant's Receiver uses a different Subject ID Format
configuration (e.g. account-based, not plain email), and "complex" may be
what *that* specific correlation mode requires, not a universal ISC
requirement. No change was made to this project's `sub_id` handling as a
result.

**Lesson for future debugging, worth keeping**: CAEP Workflow trigger
latency after a `Correlated` Event Log entry is **not always fast** —
observed delays up to ~60 seconds in this session, versus near-instant
firing seen in most other tests this project has run. Don't conclude "the
trigger didn't fire" from a short wait window; check the Event Log's
correlation status directly (UI-only, no API found) before concluding a
signal shape is broken, and if time permits, wait at least 60 seconds
before ruling out a delayed trigger.

**Forward-looking note, not urgent**: if this transmitter is ever used
across multiple SE-configured ISC tenants (Phase 3's ambition), Subject ID
Format may vary tenant-to-tenant, and supporting both `sub_id` shapes (or
making the shape configurable per tenant) could be a real robustness
improvement worth adding then — not needed for `company21912-poc` today.

### 3.16 New capability: "Quarantine" identity lifecycle state (2026-07-29)

A new lifecycle state, **Quarantine**, was added to the **HR** Identity
Profile in `company21912-poc` (Admin -> Identity Profiles -> HR ->
Lifecycle Management -> Create Lifecycle State), for the scenario "a
device is found out of compliance -> quarantine the identity." Configured
by hand via the UI, matching every other ISC-side config change in this
project.

**Configuration** (id `233f4cc5f6914af2a64e0b22a34677c9`, technical name
`quarantine`):
- Enable lifecycle: on
- Remove all access: off (a stronger, separate action not requested)
- Identity State: left as **Active** (not Inactive short-term) --
  deliberately. `identityState` and `accountActions` are independent
  fields; this tenant's own **Pre Hire** state already proves
  `identityState: "ACTIVE"` combined with `accountActions: DISABLE` is a
  normal, supported combination. Leaving it Active does not weaken the
  actual disable behavior at all -- it only affects secondary
  categorization (certification/reporting inclusion), not requested here.
- Disable Accounts: **Specific sources** -- PRISM
  (`8c63bd999dd74afcb4e344ba0466ae9b`) and Active Directory
  (`ca713180aecb4ad3b424446335af000d`) only. HR and IdentityNow
  deliberately excluded, same reasoning as the existing PRISM-only
  Workflow scoping (Section 3.8): HR is an authoritative source of
  record, not an access system.

**Real ISC API used** (no native Workflow action exists for this --
see below): `POST /v3/identities/{id}/set-lifecycle-state`, body
`{"lifecycleStateId": "<id>"}`. Returns 200 with an `accountActivityId`
-- this is an **async** provisioning job; allow 15-30+ seconds before
checking results (both the lifecycle-state change itself and the
account enable/disable side effects lag behind the API call).

**Verified end-to-end** via `scripts/set-quarantine.ts`
(Jayme Cannon -> Quarantine, then back to Active
`347f044b05944339988fc782743e8d53`):
- `cloudLifecycleState` (via the `identities` search index --
  `scripts/search-identity-access.ts`) correctly read `"quarantine"`,
  then `"active"` after reverting.
- PRISM and Active Directory accounts: `disabled: true` while
  quarantined, `disabled: false` after reverting (confirmed via
  `scripts/check-quarantine-result.ts`).
- IdentityNow and HR accounts: untouched (`disabled: false`) throughout,
  confirming the specific-sources scoping worked correctly.

**Automation status: deliberately NOT wired to any Workflow.** This is a
manual capability only, triggered by running the script above with a
real identity ID. A real design investigation preceded this decision --
worth recording in full since it's a template for similar future asks:

1. **No native Workflow action exists** to set an identity's lifecycle
   state (confirmed via an exhaustive `beta/workflow-library` search --
   `scripts/search-lifecycle-action.ts`). The only lifecycle-state-related
   library entries are two *reactive* trigger events (`Identity Lifecycle
   State Changed`/`...Processed`), which fire *after* a change happens
   elsewhere -- nothing *causes* one.
2. Checked whether a native **identity-attribute-update** action exists
   that could indirectly trigger a criteria-based automatic lifecycle
   transition instead (`scripts/search-attribute-update-action.ts`) --
   also does not exist. No native path of any kind.
3. The only way to actually make this change from a Workflow is the real
   `set-lifecycle-state` API, which needs the identity ID as a URL path
   segment -- the same string-templating limitation already confirmed in
   Section 3.14 (`sp:http`'s `url` field only supports full-value
   JSONPath, no partial substitution).
4. A workaround was designed (Workflow calls a new endpoint on our own
   transmitter via `sp:http`, body-based so the templating limit doesn't
   apply, and our own server-side code makes the real ISC call) but was
   **explicitly rejected by the user**: this would require the *deployed*
   transmitter app itself to hold live ISC write credentials and use them
   automatically/unattended -- a new trust boundary categorically
   different from everything else in this project, where every ISC write
   is either a native Workflow action (no external credentials at all) or
   a script a human runs locally, by hand, with credentials that never
   leave their machine.
5. **Decision: mark full automation out of scope.** No native path
   exists, and the one non-native path available was correctly ruled out
   on security grounds. This is a genuine, confirmed ISC platform gap --
   not a bug to keep chasing, and not worth building a workaround for
   given the stated constraint. If this needs to be automated later, the
   two real options are (a) a native "Set Lifecycle State" action if
   SailPoint ever ships one, or (b) a **notify-only** Workflow (native
   `Send Email`/`Interactive Message` action recommends quarantine to an
   admin, who completes the actual change by hand) -- discussed with the
   user but not yet built; revisit if wanted.

### 3.17 Catalog finalized (5 vendors, 15 scenarios) + the last 2 CAEP-type Workflows built (2026-07-29)

**Catalog**: after a detour through a different 24-scenario set built from
a second reference app (a teammate's live `ssf-signal-portal.vercel.app`
portal), the catalog was reverted back to the original 14 scenarios
imported from the first teammate payload (`acme-demo` export) --
CrowdStrike (3), Microsoft (2), Okta (3), Proofpoint (3) -- with Zscaler's
3 scenarios (including the sole `token-claims-change` one) dropped and
replaced by 4 Jamf scenarios (all `device-compliance-change`, from the
second reference app, already vetted). **15 scenarios, 5 vendors, final.**
Current vendor/event/CAEP-type/Workflow mapping:

| Vendor | Event | CAEP Type | Workflow |
|---|---|---|---|
| CrowdStrike | Host Isolated | risk-level-change | Disable PRISM |
| CrowdStrike | Host Isolated (Device Compliance) | device-compliance-change | Disable PRISM |
| CrowdStrike | Identity Compromise Detected | risk-level-change | Disable PRISM |
| Microsoft | High-Risk User Flagged | risk-level-change | Disable PRISM |
| Microsoft | Session Hijack Detected | session-revoked | Disable PRISM+AD, create campaign |
| Okta | Credential Reset | credential-change | Disable PRISM+AD, create campaign |
| Okta | MFA Unenrollment | credential-change | Disable PRISM+AD, create campaign |
| Okta | Session Revoked | session-revoked | Disable PRISM+AD, create campaign |
| Proofpoint | DLP Violation | risk-level-change | Disable PRISM |
| Proofpoint | TAP Malicious Click | risk-level-change | Disable PRISM |
| Proofpoint | Very Attacked Person (VAP) Flagged | risk-level-change | Disable PRISM |
| Jamf | Device Non-Compliant | device-compliance-change | Disable PRISM |
| Jamf | Device Returned to Compliance | device-compliance-change | *(correctly doesn't fire -- reverse direction, existing filter)* |
| Jamf | Management Status Lost | device-compliance-change | Disable PRISM |
| Jamf | Required Security Tool Missing | device-compliance-change | Disable PRISM |

**All 5 CAEP types now have a live, proven Workflow** -- the
`credential-change` and `session-revoked` Workflows were built today,
closing what was the last real gap:

- **`sp:manage-account` schema checked first** (per the "check native
  actions before reaching for a workaround" lesson from Section 3.14):
  only `disable`/`enable`/`unlock`/`delete` operations exist -- no native
  credential-reset or session-kill action. Confirmed via
  `scripts/check-manage-account-schema.ts`. This means the honest ceiling
  for these two types' remediation is the same account-disable action
  already used for `risk-level-change`/`device-compliance-change` --
  not a shortcut, the platform's actual capability.
- **Combined remediation, at the user's request**: both new Workflows
  disable PRISM **and** Active Directory (broader than the existing
  PRISM-only Workflows -- matching the Quarantine lifecycle state's
  scoping, Section 3.16), **and** create a certification campaign
  (reusing the `reviewerCertificationType: "IDENTITY"` fix from Section
  3.14) -- two distinct native actions per Workflow, more than any of the
  3 existing ones.
- **New bug found and fixed**: a Workflow step's auto-generated JSONPath
  reference name is derived from its **object key**, not its
  `displayName`. The first attempt named the manager-lookup step
  `"Get Identity's Manager"` (matching only the *displayName* convention
  used elsewhere) -- the apostrophe/spaces meant ISC couldn't produce a
  usable camelCase reference, so it kept the literal string, and
  `Send Email`'s `$.getIdentity1.attributes.email` reference resolved to
  nothing, failing with `"invalid parameter type received for
  recipientEmailList"`. Fixed by using the key `"Get Identity 1"`
  (matching the original working Workflow's exact convention) with
  `displayName: "Get Identity's Manager"` as a separate field. Applied
  live via `scripts/fix-credential-change-step-key.ts`; the
  `session-revoked` Workflow used the corrected pattern from creation and
  worked on the first attempt.
- **Quarantine lifecycle-state automation revisited and declined again**:
  before building these two Workflows, the user asked to reconsider
  automating the Quarantine transition (Section 3.16) as part of them.
  The only technical path (a dedicated, narrow-scope ISC API client
  called directly from the Workflow's own `sp:http` step, credential
  living only in that Workflow's JSON -- distinct from the earlier
  rejected "deployed transmitter holds credentials" design) was discussed
  in detail, but ultimately declined by the user. Both new Workflows
  disable accounts + create a campaign only; Quarantine remains a manual
  script step (`scripts/set-quarantine.ts`), unchanged from Section 3.16's
  decision.
- **Verified end-to-end for both**: real signal -> correlated -> trigger
  fired -> PRISM+AD disabled -> certification campaign created `ACTIVE`
  -> manager notified. Confirmed via `scripts/check-quarantine-result.ts`
  and `scripts/list-campaigns.ts` after each test; PRISM+AD restored
  afterward via `scripts/enable-prism-and-ad.ts`.

### 3.18 Simulator UI built, deployed, and proven end-to-end (2026-07-29, later session)

**The single largest gap in this project -- no SE-facing UI, Section 7 item
6 -- is closed.** A design prompt was written
(`docs/SIMULATOR_UI_DESIGN_PROMPT.md`), run through Claude Design to produce
a visual/interaction prototype, then implemented for real: three Next.js
pages plus one API route, wired directly to the already-proven backend
(`sendSsfSignal()`, `AuditLog`) with no mocks and no simulated data anywhere.

**Pages built:**
- **Simulator** (`app/page.tsx`) -- vendor grid (5 vendors) -> event
  dropdown (15 scenarios) -> subject email -> live JSON payload preview ->
  Send button -> real HTTP result. Deliberately scoped down from the
  Claude Design reference (which modeled a teammate's fuller, 8+-vendor
  multi-tenant portal) to exactly this project's 5 vendors/15
  scenarios/3 pages -- see the design doc's "What NOT to include" section.
- **History** (`app/history/page.tsx`) -- server component reading
  `AuditLog` directly, most recent first.
- **Credentials** (`app/credentials/page.tsx` +
  `components/CredentialsPanel.tsx`) -- read-only Discovery URL + API
  token display with Show/Copy, matching exactly what Section 10.3 asks an
  SE to paste into ISC -- nothing else (no OAuth-client-secret storage
  form, which the reference portal has but which would mean *this* app
  holding another tenant's ISC write credentials -- rejected per the same
  credential-boundary reasoning as Section 3.16).
- **`app/api/simulate/route.ts`** -- the only new backend surface: takes
  `{scenarioKey, subjectEmail}`, resolves the tenant's newest `enabled`
  stream (`lib/streams.ts`), calls `sendSsfSignal()`. Nothing here
  duplicates or re-implements signing/correlation logic.

**Schema change**: `AuditLog.scenarioKey` (nullable) added so History can
show the real vendor/event name instead of just the CAEP type. Migration
`20260729120000_add_audit_log_scenario_key`. Existing pre-UI audit rows
(from CLI script testing) correctly show `—` for vendor since they predate
this column -- not a bug.

**Real bug found and fixed: wrong environment variable broke every
UI-triggered send.** `.env`'s `NEXT_PUBLIC_APP_URL` was set to
`http://localhost:3000` for local browsing convenience, but that same
value gets baked into every signed token's `iss`/`aud` claims (via
`tenantIssuer()`/`appBaseUrl()` in `lib/ssf.ts`). ISC's Receiver only
trusts tokens whose issuer matches its registered Discovery URL
(`https://ssf-transmitter-chi.vercel.app`), so every send from the locally
running dev server was silently failing ISC's audience check --
delivery still returned HTTP 202 (accepted), but nothing ever correlated
or fired a Workflow. This is exactly why old CLI test scripts always
worked: Section 10.3 step 8 has always documented overriding
`NEXT_PUBLIC_APP_URL` inline on the command line for real sends, so the
long-running dev server's `.env` value was never actually exercised
against a real ISC round-trip until today. **Fix**: set
`NEXT_PUBLIC_APP_URL` in `.env` to the real deployed URL even for local
dev -- ISC never talks to localhost in this flow at all, so there's no
reason for the two to differ. Confirmed fixed via a real re-test
(signal -> correlated -> Workflow fired -> PRISM disabled, ~17s).

**Prisma 7 migration-connection split fixed as a side effect of debugging
this.** The project had one `DATABASE_URL` read by two different code
paths that happened to share a name: `lib/prisma.ts` (real app runtime,
via `@prisma/adapter-pg`) and `prisma.config.ts` (Prisma CLI --
migrate/generate). Prisma 7 removed the old `directUrl` schema.prisma
field entirely; the CLI-only connection is now whatever `prisma.config.ts`
points at, independent of the app's own runtime connection. Added a
second env var, `DIRECT_URL` (Supabase Session pooler, port 5432,
matching Prisma's own documented Supabase-integration convention),
read only by `prisma.config.ts`. `DATABASE_URL` (Transaction pooler, port
6543) also got `?pgbouncer=true` appended, per current Prisma+Supabase
guidance for driver-adapter runtime connections -- confirmed via Prisma's
own docs, not assumed. Both changes verified independently (each didn't
break the other) before combining them. **Both variables must also exist
in Vercel's own Environment Variables** (separate from local `.env`) --
added there too, confirmed via a successful production build.

**Verified working for real, not just claimed**: 4 of the 5 CAEP types in
the catalog were each sent for real through the fixed UI (one scenario per
type) after the `NEXT_PUBLIC_APP_URL` fix, plus the one scenario that's
supposed to *not* fire:
- CrowdStrike Host Isolated (`risk-level-change`) -> PRISM disabled
- Jamf Device Non-Compliant (`device-compliance-change`) -> PRISM (+AD,
  see below) disabled
- Okta Credential Reset (`credential-change`) -> PRISM+AD disabled,
  certification campaign created
- Microsoft Session Hijack Detected (`session-revoked`) -> PRISM+AD
  disabled, certification campaign created
- Jamf Device Returned to Compliance (reverse direction) -> correctly did
  not fire (before the change below), then correctly DID fire and
  re-enabled accounts (after it)

**`device-compliance-change` Workflow scope expanded, at user request,
during this same session:**
1. **Disable action now covers PRISM + Active Directory**, not PRISM-only
   (`scripts/update-device-compliance-workflow.ts`) -- matching the
   broader scope already used by the credential-change/session-revoked
   Workflows.
2. **New capability: the reverse-direction scenario ("Device Returned to
   Compliance") now does something real** -- it re-enables PRISM+AD --
   instead of silently correlating and doing nothing. Built as a `choice`
   step branching on the event's `current_status` claim: `not-compliant`
   -> Disable Accounts, anything else (`compliant`) -> Enable Accounts
   (defaultStep). **This works, where an earlier attempt at Workflow
   branching in this project (Section 7 item 5) did not, because
   `current_status`/`previous_status` are OFFICIAL, required CAEP claims
   for this event type** (`lib/caep.ts`'s `CAEP_REQUIRED_CLAIMS`) -- ISC
   never strips these, unlike the custom `vendor`/`recommended_action`
   fields that Section 7 item 5 proved get stripped before a Workflow ever
   sees them. Branching on an event type's own required schema field is a
   genuinely different, viable case from branching on custom claims across
   vendors.
3. Widened the trigger's `filter.$` to match both `current_status` values
   (was `not-compliant`-only), since the choice step now needs both
   directions to actually reach the Workflow at all.
4. Verified end-to-end for both directions. The re-enable direction took
   unusually long (~4 minutes, vs. ~10-20s for every other test this
   project has run) the one time it was tested -- likely because the
   disable and enable actions were fired on the same PRISM/AD accounts
   only ~20 seconds apart, and the connector needed several backoff
   retries (`"account status check still pending"`) to converge. Not a
   bug in the Workflow logic (which routed correctly on the first try,
   confirmed via `GET /beta/workflow-executions/{id}/history`) -- worth
   knowing if a future test of this same reverse-direction scenario is run
   again shortly after its opposite.
5. `lib/remediation.ts` (the canonical CAEP-type -> Workflow/action text
   the Simulator UI displays) updated to match: `device-compliance-change`
   now says "Disable access to the PRISM application and Active
   Directory," and a new per-scenario override
   (`SCENARIO_ACTION_OVERRIDE`) gives "Device Returned to Compliance" its
   own distinct text ("Re-enable access to the PRISM application and
   Active Directory") instead of the old "(correctly does not fire)"
   note, which is no longer true.

**Deployed to production and re-verified there independently** -- not
assumed to behave the same as local just because it's the same database.
Committed (`e510a80`) and pushed to `main`, which triggered a real Vercel
deployment. After the two env vars above were added to Vercel's own
project settings and the deployment redeployed, a real signal was sent
directly against the **production** `/api/simulate` endpoint (`curl`, not
just page-load checks) and confirmed to correlate, fire the Workflow, and
disable PRISM in ~9 seconds -- proving the fix and the deployment both
work from the actual deployed instance, not only the local dev server.

**Also fixed**: the browser-automation tool used to click through the UI
during this session had an intermittent issue where `left_click` on the
"Send signal" button sometimes didn't register (no request fired, no
error either) -- worked around each time by re-reading the page and
retrying, or by calling `/api/simulate` directly via `curl` for the
production verification. Not an application bug; nothing in the app's own
code was changed because of this.

### 3.19 Branded HTML risk-detail email added to the risk-level-change Workflow (2026-07-29)

The `risk-level-change` Workflow ("SSF Injector Demo - Remove Access When
Risk Level Changes") had an existing but completely unconfigured `Send
Email` step (`attributes: {"context": {}}`, empty `displayName`) --
apparently shipped by the source template and never filled in. Built out
for real via `scripts/update-risk-level-change-email.ts`:

- **Added a "Get Identity's Manager" step** (key `Get Identity 1`, same
  working pattern already used in the credential-change/session-revoked
  Workflows -- Section 3.17's step-key-vs-displayName lesson applied
  correctly from the start this time, no retry needed).
- **Populated the email with a branded, table-based HTML body**: a maroon
  header banner ("SailPoint Security Alert"), colored pill badges for
  previous (green) and current (red) risk level, a bordered risk-detail
  table, an amber callout box naming the action taken (PRISM disabled),
  and a footer with signature + disclaimer. All styling is inline (no
  `<style>` block -- most email clients strip those), table-based layout
  throughout (not flexbox/grid) for the same compatibility reason.
- **Deliberately does not reference `vendor`/`vendor_event_type`/
  `recommended_action`** in the email body -- confirmed again, from a real
  captured trigger payload earlier the same session, that ISC strips
  these before a Workflow ever sees them (Section 7 item 5's original
  finding still holds). Uses `reason_admin` instead, which **is**
  preserved (official CAEP claim, empirically confirmed today) and
  already carries vendor-style narrative text (e.g. "CrowdStrike: Host
  Isolated").
- **Real bug caught and fixed during this same change**: the first
  attempt set `recipientEmailList` as a plain array
  (`["$.getIdentity1.attributes.email"]`) instead of the JSONPath-
  reference convention (`"recipientEmailList.$": "..."`) every other
  working `sp:send-email` step in this project uses. As written, ISC
  would have emailed the literal text of the JSONPath expression instead
  of resolving it. Caught by testing, not assumed correct -- a real send
  showed the email would not have reached anyone real. Fixed and
  re-verified: the corrected version resolved to the identity's actual
  manager, `Martena.Heath@sailpointdemo.com`.
- **The Workflow was found disabled (`enabled: false`) at the start of
  this change**, for reasons unrelated to it (not something this session
  touched previously). Re-enabled as part of applying the fix, per the
  same disable→patch→enable pattern used throughout this project for
  structural Workflow edits.
- **Verified end-to-end twice** -- once right after adding the plain
  version of the email (caught the `recipientEmailList` bug), once again
  after the branded-HTML rewrite requested afterward. Both times: real
  signal → correlated → PRISM disabled → manager looked up correctly →
  `Send Email` step `ActivityTaskCompleted` → Workflow `Completed`, all
  within ~10 seconds.

### 3.20 Supabase Auth login added -- the deployed app was completely public until now (2026-07-29)

**Real gap closed, not a nice-to-have**: until this change, anyone with
the production URL could open the Simulator and click Send -- no login of
any kind existed, meaning a stranger could trigger a real PRISM/AD disable
or certification campaign in `company21912-poc` with zero authentication.
This matches the source doc's own stated plan (Section 6/Decisions:
"Supabase Auth ... will be adopted ... timed to land ... alongside the
start of Phase 2 Simulator UI work") -- not a new architectural decision,
just finally implementing an already-agreed one now that the Simulator
exists to protect.

**What was built:**
- `middleware.ts` + `lib/supabase/middleware.ts` -- runs on every request
  matching the config's `matcher`, calls `supabase.auth.getUser()`
  (validates against Supabase's server, not just trusting the cookie),
  and either redirects (pages) or returns `401` JSON (`/api/*` paths) if
  unauthenticated. **Deliberately excludes `/t/{slug}/...`** -- ISC's own
  protocol endpoints (discovery, JWKS, streams, verify) authenticate via
  `requireTenantByBearerToken()` (`lib/auth.ts`), not a login session;
  gating those would break the actual transmitter. Confirmed by direct
  request, not just code reading: `GET /t/company21912-poc/.well-known/
  ssf-configuration` → `200` with real discovery JSON, unauthenticated,
  both locally and in production.
- `app/login/page.tsx` -- email+password form, calls
  `supabase.auth.signInWithPassword()`. No self sign-up page exists or is
  planned -- accounts are provisioned one at a time via
  `scripts/add-user.ts`, matching the user's explicit choice.
- `app/(portal)/layout.tsx` -- a route group wrapping the 3 existing pages
  (Simulator/History/Credentials) in `PortalShell`, with its own
  server-side `getUser()` check as defense-in-depth alongside middleware
  (Supabase's own documented recommendation -- middleware alone can be
  bypassed in some edge cases). `/login` sits outside this group so it
  doesn't get the sidebar.
- `components/PortalShell.tsx` updated to show the signed-in user's email
  and a "Sign out" button (calls `supabase.auth.signOut()` client-side,
  redirects to `/login`).
- `scripts/add-user.ts` / `scripts/reset-user-password.ts` -- the only two
  ways accounts get created or have their password changed. Both use the
  `service_role` key, which **only ever exists locally** -- confirmed by
  grepping every file under `app/`, `lib/`, and `components/` for any
  reference to it; the only hit was a code comment. Never added to
  Vercel's environment variables (unlike `NEXT_PUBLIC_SUPABASE_URL`/
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which the deployed app does need) --
  deliberately, to keep the one highly-privileged key in as few places as
  possible.

**Verified end-to-end, twice** -- once locally, once again against the
real production deployment after pushing:
- Unauthenticated `GET /` → `307` to `/login` (both environments).
- Unauthenticated `POST /api/simulate` → `401 {"error":"Unauthorized"}`
  (both environments) -- not just page-level protection, the actual send
  capability is gated too.
- A real (throwaway, since-deleted) account signed in successfully, saw
  the Simulator/History/Credentials pages, and "Sign out" correctly ended
  the session and returned to `/login` -- confirmed both by the UI and by
  re-checking that protected routes went back to redirecting/`401`ing
  afterward.
- `GET /t/company21912-poc/.well-known/ssf-configuration` → `200`, real
  discovery JSON, unauthenticated, confirming the transmitter's actual
  protocol surface is untouched by any of this.

**One real mistake made and caught during setup, worth remembering**: the
first account was accidentally created using a placeholder password
copied verbatim from an example instead of a real chosen one -- since
that placeholder text had appeared in a chat conversation, it was no
longer private even though nothing was actually compromised (this is a
local dev tool, not a public leak vector). Fixed immediately via
`scripts/reset-user-password.ts` rather than treated as a non-issue --
worth the same care as any other credential.

**Known follow-up, not urgent**: `next dev` prints `The "middleware" file
convention is deprecated. Please use "proxy" instead` on Next.js 16.2.11.
Still fully functional today -- not fixed yet, but should be renamed
(`middleware.ts` → `proxy.ts`, per Next.js's own migration path) before a
future Next.js major version removes the old convention entirely.

### 3.21 Admin Overview dashboard + vendor catalog moved to Postgres (2026-07-30)

**The single remaining "minimum viable SE surface" gap (Section 7 item 6's
Admin catalog piece) is closed.** Prompted by the user sharing a screenshot
of a reference multi-tenant portal's Admin > Overview screen and asking for
the same for this project, plus a way to add vendor/event scenarios without
editing code.

**Overview page** (`app/(portal)/admin/page.tsx`): 4 metric tiles (Tenant/
Signals Sent/Last 24 Hours/Last 7-30 Days), a "Most-used vendor events"
table, a "Recent failures" table (last 10) -- all real Prisma aggregate
queries against `AuditLog`, no mock data. **Deliberately adapted, not
copied, from the reference screenshot**: that portal's "Tenants: 4 active"
tile was dropped at first (this project was single-tenant at the time) and
replaced with a tenant-name/stream-status tile -- then reinstated for real
once Section 3.25's multi-tenant work gave it something real to count.

**Vendor catalog moved from a static `lib/catalog.ts` file into a new
`VendorScenario` Postgres table** (`prisma/schema.prisma`), because the
old file could only be edited by changing code and redeploying -- exactly
the gap Section 7 item 6 named. `lib/vendorScenarios.ts` is the new DB
access layer (`listVendorScenarios()`/`getVendorScenario()`/
`createVendorScenario()`/`deleteVendorScenario()`); `scripts/seed-vendor-
scenarios.ts` was a one-time migration of the original 15 scenarios into
the table (preserving their exact keys, since `AuditLog.scenarioKey`
already referenced them). Every runtime consumer (Simulator, History,
`/api/simulate`, `scripts/send-scenario.ts`) was switched over; the
Simulator page was split into a server component (`app/(portal)/page.tsx`,
fetches scenarios) wrapping a new client component
(`components/SimulatorClient.tsx`, the interactive form, unchanged
behavior). `lib/catalog.ts` itself was kept, used only by the one-time seed
script for historical reference.

**Admin > Catalog page** (`app/(portal)/admin/catalog/page.tsx` +
`components/CatalogManager.tsx`): lists every scenario, and an "Add vendor
event" form that writes directly to the new table -- **verified live**: a
test Zscaler scenario added through the form appeared in the Simulator's
vendor grid immediately, no redeploy, then was deleted (both catalog
scope changes in this section were test-and-revert, catalog is back to
the original 15/5-vendor state committed in Section 3.17).

All 28 existing integration tests updated to read from the DB instead of
importing the static map (`tests/integration/catalog.test.ts`) -- still
passing, now also covering whatever an admin adds through the UI, not
just the original static set.

### 3.22 Typo-proofing the Add-vendor form + a real fix for `token-claims-change` (2026-07-30)

Two real gaps found by the user actually trying to use the new Admin
catalog form (Section 3.21), both fixed the same session:

**Gap 1 -- claim values were free-typed JSON, no validation against what
ISC actually accepts.** The exact mistake that broke real sends before
(`current_level: "high"` lowercase, Section 3.5 item 11) was reachable
again through the new UI with zero guardrails. **Fixed**: replaced the raw
JSON textarea with per-CAEP-type dropdowns/fields backed by closed enum
lists in `lib/caep.ts` (`CURRENT_LEVEL_VALUES`, `CURRENT_STATUS_VALUES`,
`CREDENTIAL_TYPE_VALUES`, `CHANGE_TYPE_VALUES` -- the credential-change
enums fetched directly from the OpenID CAEP 1.0 spec via WebFetch, not
guessed; the risk-level-change enum kept to the 3 values already
empirically proven against this tenant, since "risk-level-change" itself
isn't in the base OpenID CAEP spec -- it's ISC's own event, and inventing
a 4th untested value would repeat the exact mistake being fixed).
Enforced **server-side too**, not just in the form
(`lib/vendorScenarios.ts`'s `normalizeClaims()`), so a direct API call
can't bypass it either.

**Gap 2 -- `token-claims-change` scenarios silently never fired.** The
live "Create a Certification Campaign When Token Claims Change" Workflow's
trigger filter requires `initiating_entity == "policy"` nested inside the
claims (confirmed via `scripts/test-execute-workflow.ts` and Section
3.12's original investigation) -- a real, previously-proven requirement
that only ever existed as tribal knowledge inside one now-deleted catalog
entry (Section 3.17 dropped the only `token-claims-change` scenario from
the catalog). The new Admin form had no way to know about it, so a
scenario built through the UI would deliver and correlate fine but never
fire anything -- a real regression the user caught by asking direct
questions rather than accepting "it should work." **Fixed**: the claims
editor for this type now builds the nested `{ claims: {...} }` shape from
a simple key/value row editor, and the server **always** force-injects
`initiating_entity: "policy"` (`lib/vendorScenarios.ts`), ignoring
whatever a caller sends -- can't be created wrong, via the form or the
API.

**Verified live, twice.** First: added a real Zscaler `token-claims-
change` test scenario through the form, sent it for real, confirmed the
Workflow fired -- real `ACTIVE` certification campaign created
(`"Emergency Access Review"`), correctly scoped to one identity, real
email delivered to the manager, all within ~34 seconds. Second (explicit
user request, "we need to make sure it works"): re-verified the exact
same chain a second time after the code was finalized. Test scenario
removed afterward each time, catalog back to its committed 15/5-vendor
state.

### 3.23 Branded HTML emails on all 3 certification-campaign Workflows (2026-07-30)

Following on from the risk-level-change email (Section 3.19), the user
asked whether the same treatment could apply to the other 3 Workflows
that create a certification campaign (`credential-change`,
`session-revoked`, `token-claims-change`) -- all 3 previously had either
plain unstyled HTML or, for `token-claims-change`, messy Word-pasted
markup with garbage class names, never intentionally designed.

Built via `scripts/update-certification-campaign-emails.ts` (disable →
patch full `/definition` → re-enable, the same safe pattern used for
every structural Workflow edit in this project). **Deliberately styled
distinctly from the risk-level-change email** (amber/gold banner instead
of maroon), per explicit user direction, so a "certification review"
notice reads differently from an "access disabled" alert at a glance --
same table-based, all-inline-styles email-client-safe construction
otherwise. Also adds a "Details" field using `reason_admin` (the one CAEP
claim ISC actually preserves, per Section 7 item 5's finding) -- these 3
emails never showed any vendor narrative context before.

**Verified live, all 3 simultaneously**: real signals sent for
`credential-change` (Okta/Credential Reset), `session-revoked` (Okta/
Session Revoked), and `token-claims-change` (a temporary Zscaler test
scenario) -- all 3 `Send Email` steps completed with zero errors, all
context variables resolved with real data (manager "Martena", identity
"Jayme.Cannon", correct campaign names, correct `reason_admin` narrative
per type e.g. `"Okta: Credential Reset"`).

### 3.24 Signing keys migrated to Supabase Vault, plaintext column dropped (2026-07-30)

**Closes the last item on Section 6/8's standing risk list**: signing
keys were plaintext PEM in a Postgres column since Phase 0, explicitly
flagged in the schema comment as needing to move to a real vault before
this was more than a proof-of-concept.

**Confirmed first, not assumed**: the `supabase_vault` Postgres extension
is enabled on this project (`select extname from pg_extension where
extname = 'supabase_vault'`), and the DB role behind `DATABASE_URL`/
`DIRECT_URL` (Supabase's pooler-mapped `postgres` role) has grants on
both `vault.create_secret()` and the `vault.decrypted_secrets` view --
verified with a real create/read/delete round trip before writing any
production code.

**Migration done in explicit, separately-verified stages** (matching this
project's "checkpoint before risky change" pattern, Section 3.15):
1. Added `SigningKey.privateKeySecretId` (nullable, additive migration) --
   `privateKeyPem` kept, made nullable, as a rollback safety net.
2. New `lib/vault.ts` (`storeSecret()`/`readSecret()`, parameterized
   `$queryRaw` against Vault) -- sanity-tested standalone before wiring in.
3. The one real production key backfilled via a one-time script,
   **verified byte-for-byte identical** to the original PEM after the
   round trip.
4. `lib/keys.ts` (`getOrCreateSigningKey()`) switched to write **only**
   to Vault for any new key -- confirmed live via the Tenant Configuration
   Panel (Section 3.25): every tenant created after this point has
   `privateKeyPem: null` from creation, no plaintext ever touches the DB
   for them.
5. Both `lib/ssf.ts` call sites (`sendSsfSignal()`/`sendVerificationSet()`)
   switched to fetch the PEM fresh from Vault per-signature instead of
   reading the column. **Verified with a real live send** immediately
   after: risk-level-change → correlated → PRISM disabled, confirmed via
   the Workflow's own execution trace, signed entirely with a
   Vault-fetched key.
6. **A formal pre-drop validation gate was run before touching the
   column** (`scripts/validate_key_migration.sh`, written for and kept as
   a reusable artifact): Vault retrieval + fingerprint match against the
   published JWKS (✅), a pure sign/verify roundtrip using only a
   Vault-fetched key with grep-confirmed no DB-fallback code path
   remaining (✅), DB column pre-drop sanity (✅), no plaintext key found
   anywhere in tracked source/git history/`.env`/session logs (✅).
   Backup coverage (Gate 5) could not be independently verified (no
   Supabase dashboard access from this tool, and this project is on
   Supabase's free tier, which doesn't include automated backups by
   default) -- reported as an explicit unresolved gate, not silently
   passed. A manual local export of the one legacy key was made as a
   mitigation before proceeding.
7. **The actual column drop was sequenced deliberately to avoid ever
   having deployed code and DB schema disagree**: schema change + new
   Prisma Client committed and **pushed to production first** (confirmed
   healthy before touching the database), *then* `npm run migrate` ran
   the actual `ALTER TABLE ... DROP COLUMN` against the shared database.
   Doing it in the reverse order (drop first, deploy second) would have
   broken every signal send in the window between the two -- this was
   identified and explained before executing, not discovered by breaking
   something.
8. **Verified post-drop, live**: column confirmed gone via
   `information_schema.columns`, all 28 tests still pass, production
   health-checked, and a real signal sent afterward correlated and fired
   the Workflow (PRISM disabled then re-enabled).

The one-time backfill script (`scripts/migrate-signing-key-to-vault.ts`)
was deleted once its job was done and the column it referenced no longer
exists.

### 3.25 Multi-tenant support: Tenant panel, switcher, cross-tenant Overview (2026-07-30)

Prompted by a direct question: "if this tool is meant to allow many SEs to
use it, what changes need to be made?" **Scoped deliberately narrower than
a full multi-tenant SaaS pivot** -- no per-user tenant isolation, no
change to the "each operator manages their own set of ISC tenants from one
deployed instance" model. What changed: a single deployed instance can now
track and switch between *multiple* ISC tenants instead of exactly one.

**Correction of an early misunderstanding, worth keeping**: the connection
direction is ISC → transmitter, not the reverse (receiver-initiated, per
Section 1's original architecture finding) -- so this feature does **not**
mean an SE enters their ISC org's credentials into this app. It's the
opposite: the app generates a Discovery URL + API token *for* a new
tenant, and the SE pastes *those* into ISC's own admin console, same
one-time manual link this project has always required. There is no
SE-supplied ISC secret to store, so the credential-boundary concern
initially raised for this feature didn't end up applying.

**Piece 1 -- Tenant Configuration Panel** (`app/(portal)/admin/tenants/
page.tsx` + `components/TenantManager.tsx` + `lib/tenants.ts` +
`app/api/admin/tenants/route.ts`): lists existing tenants (slug, name,
stream status, created date) and a create form -- a GUI wrapper around
exactly what `scripts/provision-tenant.ts` already did, reusing the same
`getOrCreateSigningKey()` call (so new tenants go straight through the
Vault-only path from Section 3.24). Verified live: created a real test
tenant, confirmed `privateKeyPem: null`/`privateKeySecretId` set and
readable back out of Vault.

**Piece 3 -- Overview cross-tenant aggregation** (`app/(portal)/admin/
page.tsx`, rewritten): dropped the single-tenant `where: {tenantId}`
filter from every Overview query, added a real "Tenants" tile
(`N active, M not linked`, via `lib/tenants.ts`'s `listTenantsWithStatus()`),
added a Tenant column to the Recent Failures table. Read-only page, zero
risk to the signing/sending pipeline.

**Piece 2 -- tenant switcher** (the one piece touching the live
signal-sending path, built last and verified most carefully):
`TENANT_SLUG` (a hardcoded constant) replaced by
`getSelectedTenantSlug()` (`lib/tenant.ts`) -- a cookie-based resolver
that falls back to the first tenant ever created when nothing is
selected, so a single-tenant deployment behaves identically to before
with zero visible change. New `POST /api/tenant-selection` route sets the
cookie (gated by the same auth middleware as every other `/api/*` route).
`PortalShell.tsx` now renders a real `<select>` switcher instead of static
text. **Verified live, end-to-end**: created a second tenant, switched to
it, confirmed the Credentials page showed *that* tenant's own real
Discovery URL (not the original); switched back and sent a real signal
through the actual Simulator UI -- correlated, fired the Workflow, PRISM
disabled then re-enabled, confirmed via the execution trace.

**Safety process, done at the user's explicit request ("make sure we can
revert back and not break anything")**: all 3 pieces built on a fresh
`dev` branch (the project's pre-existing `dev` branch had gone stale --
10 commits behind `main`, predating this entire session -- deleted and
recut from the current `main` tip rather than reused). Each piece
committed and fully verified (tests + a live send where relevant) before
the next started. Merged to `main` via a single clean, conflict-free
`git merge` only after the user reviewed the live preview themselves;
local `dev` deleted after the merge (fully merged, nothing lost, trivial
to recreate for future work).

---

## 4. Files Created or Modified

All paths relative to `SSF Signals Portal Projects/ssf-transmitter/` unless
noted.

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Data model: `Tenant` (slug, apiToken, name), `SigningKey` (RS256 keypair per tenant, private key in DB — flagged as needing a real vault before production use), `Stream` (deliveryEndpointUrl, eventsRequested, status, authorizationHeader), `AuditLog` (every send attempt, success/fail) |
| `prisma/migrations/20260723000000_init/migration.sql` | Initial Postgres schema migration |
| `lib/prisma.ts` | Prisma client singleton, wired to `@prisma/adapter-pg` using `DATABASE_URL` |
| `lib/caep.ts` | The 5 supported CAEP event type URIs, their required-claims map, `buildCaepEvent()` claim builder that throws `MissingCaepClaimsError` if required claims are absent. Also builds `vendor`/`vendor_event_type`/`recommended_action` (known-stripped-by-ISC, kept for audit value) and `reason_admin`/`reason_user` (official CAEP claims, auto-wrapped as `{ en: value }` — see Section 3.11) |
| `lib/catalog.ts` | The vendor scenario catalog (`vendor`/`displayName`/`triggerCode`/claims per CAEP type) — 5 scenarios, one per CAEP type (Section 3.10) |
| `lib/keys.ts` | RS256 keypair generation per tenant (`getOrCreateSigningKey`), PEM import helper |
| `lib/auth.ts` | `requireTenantByBearerToken()` — validates ISC's bearer token against the tenant's stored `apiToken` |
| `lib/ssf.ts` | Core transmitter logic: `appBaseUrl()` (auto-detects Vercel's production URL), `tenantIssuer()`, `ssfConfigurationDocument()`, `sendSsfSignal()` (build claims → sign SET with `sub_id`+`aud` → POST to stream's `deliveryEndpointUrl` → audit log), `sendVerificationSet()` (same, for the verify handshake) |
| `app/t/[slug]/.well-known/ssf-configuration/route.ts` | GET discovery document |
| `app/t/[slug]/.well-known/jwks.json/route.ts` | GET public signing key |
| `app/t/[slug]/ssf/streams/route.ts` | GET (list/by id)/POST (create)/PATCH (refresh — captures `authorization_header` rotation) |
| `app/t/[slug]/ssf/status/route.ts` | GET/POST stream status |
| `app/t/[slug]/ssf/verify/route.ts` | POST verify handshake — **still unresolved response shape**, see Section 7 |
| `scripts/provision-tenant.ts` | CLI: `npm run provision-tenant -- <slug> "<name>"` — creates a tenant + signing key |
| `scripts/test-send.ts` | CLI smoke test: sends a real `risk-level-change` SET. Currently hardcoded to `tenantSlug: "company21912-poc"` and `subjectEmail: "Jayme.Cannon@sailpointdemo.com"` — **not yet parameterized**, edit the file directly to test a different tenant/identity. For other CAEP types, use `send-scenario.ts` instead |
| `scripts/send-scenario.ts` | `npx tsx --env-file=.env scripts/send-scenario.ts <streamId> <scenarioKey> [subjectEmail] [tenantSlug]` — sends any `lib/catalog.ts` scenario; run with no args to list all 5 |
| `scripts/mock-receiver.mjs` | Throwaway local HTTP listener used for early local-only testing (no longer needed against the real tenant, kept for reference) |
| `scripts/check-audit.ts` | Dumps recent `AuditLog` rows — useful to check whether a push actually succeeded (`httpStatus`/`success`) independent of ISC's UI |
| `scripts/list-streams.ts` | Lists all streams for a tenant slug, with IDs — use this to find a stream ID for `test-send.ts` |
| `scripts/list-isc-identities.ts` | Read-only: uses `company21912/.env.local` OAuth creds to list real ISC identities |
| `scripts/check-stream-auth.ts` | Decodes a stream's stored `authorizationHeader` JWT and reports its expiration — use this if signal sends start failing with 401 again |
| `scripts/check-api-scope.ts` | Read-only: decodes the `company21912` API client's token to show its granted `authorities`/scope |
| `scripts/get-workflow.ts` | Read-only: fetches a live ISC Workflow's definition JSON by name **or id** via the `company21912` API client — use this to see a Workflow's real steps/schema before editing it |
| `scripts/check-workflow-execution.ts` | Read-only: `npx tsx scripts/check-workflow-execution.ts [workflowId]` — fetches a Workflow's most recent execution status/timestamps (defaults to the risk-level-change Workflow if no id given) |
| `scripts/check-prism-account.ts` | Read-only: fetches Jayme Cannon's PRISM account by ID directly — use to check disabled/enabled state after a test send |
| `scripts/list-trigger-definitions.ts` | Read-only: hits `GET /beta/triggers` (undocumented but working) to list every CAEP trigger's exact `id` — use this instead of guessing trigger IDs when wiring a new Workflow via API |
| `scripts/check-trigger-subscriptions.ts` | Read-only: `GET /beta/trigger-subscriptions` — lists every Workflow's live trigger registration including its actual stored filter. The fastest way to confirm a Workflow is correctly wired (or find a filter bug like Section 3.10's) |
| `scripts/check-execution-detail.ts` | Read-only: `npx tsx scripts/check-execution-detail.ts <workflowId> <executionId>` — tries several endpoint shapes for step-by-step execution history; the one that actually works is `GET /beta/workflow-executions/{executionId}/history` (undocumented, found by trial) |
| `scripts/check-campaign.ts` | Read-only: attempted direct campaign lookup by ID — endpoint guessed (`/v3/certifications/campaigns/{id}`) 404'd; kept for reference but not confirmed working |
| `scripts/check-entitlements.ts` | Read-only: attempted to list an identity's entitlements via API — endpoints guessed didn't work either; the UI (Identity → Access → Entitlements tab) was used instead. Kept for reference |
| `scripts/list-workflow-templates.ts` | Read-only: explores `GET /beta/workflow-library` (91 items: triggers, actions, operators — building blocks, not full pre-assembled workflow templates) — useful for finding an action's exact `actionId` and required-field schema (e.g. `sp:create-campaign`) before hand-building a Workflow step via API |
| `scripts/create-device-compliance-workflow.ts` | One-time: created the `device-compliance-change` companion Workflow via `POST /beta/workflows`. Already run — kept as a record of the exact definition/trigger shape used (Section 3.10) |
| `scripts/fix-device-compliance-trigger-filter.ts` | One-time: fixed the missing `filter.$` key on the Workflow `create-device-compliance-workflow.ts` created (Section 3.10). Already run |
| `scripts/test-vendor-filter.ts` | One-time experiment (Section 3.13): tests whether ISC's trigger filter can see custom claims like `vendor`. Result: no. Reverts the filter it modifies automatically, regardless of outcome — safe to re-run if the question ever needs re-verifying |
| `scripts/get-workflow.ts` / `scripts/get-campaign-detail.ts` / `scripts/get-campaign-detail-beta.ts` | Read-only: fetch a live Workflow's or campaign's full JSON — used throughout Section 3.14's investigation to capture the actual request body a native action builds |
| `scripts/check-execution-detail.ts` | Read-only: full step-by-step execution history via `GET /beta/workflow-executions/{id}/history` — the key diagnostic that revealed the `searchCampaignInfo.type:"ACCESS"`/`query:"*"` bug (Section 3.14) |
| `scripts/fix-token-claims-campaign-scope.ts` | One-time: removed a dangling `reviewerAccessConstraintIds.$` attribute referencing a nonexistent step — turned out not to be the actual bug, kept for the record (Section 3.14) |
| `scripts/try-identity-certification-type.ts` / `scripts/finalize-workflow-fix.ts` | One-time: the actual fix — switches `Create Certification Campaign` to `reviewerCertificationType: "IDENTITY"`, sets `activateUponCreation: true`, hardcodes the campaign name to "Emergency Access Review" (Section 3.14). Already applied to the live Workflow; re-running is safe/idempotent |
| `scripts/test-execute-workflow.ts` / `scripts/toggle-workflow-enabled.ts` | Reusable: test-executes a Workflow via `POST /beta/workflows/{id}/test` (a **real execution**, not a dry-run — confirmed empirically) with a synthetic `token-claims-change` trigger payload; toggles a Workflow's `enabled` flag (required to be `false` before structural edits or `/test`) |
| `scripts/list-campaigns.ts` / `scripts/create-emergency-access-review.ts` / `scripts/activate-campaign.ts` | Read-only list / one-time manual creation+activation of the first "Emergency Access Review" campaign, built before the Workflow fix landed (Section 3.14's cleanup note) |
| `scripts/list-all-actions.ts` / `scripts/check-activate-campaign-schema.ts` | Read-only: enumerate every native Workflow action and inspect one's schema — used to discover `sp:activate-campaign` and `reviewerCertificationType`'s `IDENTITY` branch |
| `vitest.config.ts` | Vitest config: `tests/**/*.test.ts`, `@/` path alias matching `tsconfig.json`, 15s timeouts (tests hit real Postgres + spin up local HTTP listeners) |
| `tests/helpers/tenant.ts` | `createTestTenant()`/`cleanupTenant()` — provisions/tears down a throwaway tenant+signing key per test, isolated by a random slug |
| `tests/helpers/mock-receiver.ts` | `MockReceiver` — a local HTTP listener standing in for ISC's stream delivery endpoint; captures raw request bytes so tests can decode and assert on the actual signed SET |
| `tests/integration/discovery.test.ts` | Discovery doc + JWKS: delivery-method URN, full-URL `issuer` (iss-mismatch regression), JWKS shape, 404 for unknown tenant |
| `tests/integration/streams.test.ts` | `POST`/`GET`/`PATCH` `/ssf/streams`: auth, unsupported event types, `iss`/`status`/`aud` regressions, PATCH-without-status, `authorization_header` rotation capture (the costliest bug this session) |
| `tests/integration/send-signal.test.ts` | `sendSsfSignal()`/`sendVerificationSet()`: required-claim validation, stream-status gating, `sub_id`/`aud` claim-shape regressions, current `vendor`/`vendor_event_type`/`recommended_action` shape, `reason_admin`/`reason_user` localized-object shape (Section 3.11 regression), audit logging |
| `tests/integration/auth.test.ts` | `requireTenantByBearerToken()`: valid/missing/wrong-scheme/wrong-token/cross-tenant/unknown-slug cases |
| `tests/integration/catalog.test.ts` | Every `lib/catalog.ts` scenario passes claim validation; catalog covers ≥3 and exactly 5 distinct CAEP types (never a 6th) |
| `package.json` | `build`: `next build` (deliberately does NOT run migrations); `migrate`: `prisma migrate deploy` (run manually against the Session pooler); `postinstall`: `prisma generate`; `provision-tenant` script alias; `test`: `node --env-file=.env node_modules/vitest/vitest.mjs run` |
| `.gitignore` | Excludes `.env*`, `/app/generated/prisma`, `/dev.db*`, AI-assistant reference folders (`.agents`, `.claude/skills`, `.windsurf/skills`) |
| `README.md` | Self-deploy instructions (Supabase + Vercel), Phase 0 gate checklist, "what this is NOT" section |
| `docs/How to Build the SSF Transmitter.md` | Copied in from the original architecture doc for onboarding context |
| `docs/sailpoint-support-case-verify-endpoint.md` | Drafted, evidence-backed support case for the unresolved `/ssf/verify` issue — **not yet submitted to SailPoint** |
| `docs/HANDOFF_RUNBOOK.md` | This document |
| `docs/SIMULATOR_UI_DESIGN_PROMPT.md` | The Simulator UI's design spec (Section 3.18) — vendor/scenario matrix, what to build vs. explicitly not build, saved this time so it doesn't get lost like last session's verbal-only prompt did |
| `app/page.tsx` | The Simulator page (client component) — vendor/event/subject form, live JSON preview, Send button |
| `app/history/page.tsx` | The History page (server component) — reads `AuditLog` directly, no client fetch needed |
| `app/credentials/page.tsx` + `components/CredentialsPanel.tsx` | The Credentials page — server component resolves the tenant's real discovery URL/token, client component handles Show/Copy interactivity |
| `app/api/simulate/route.ts` | The only new backend surface — `{scenarioKey, subjectEmail}` → resolves the tenant's newest enabled stream → `sendSsfSignal()` |
| `components/PortalShell.tsx` | Shared sidebar nav (Simulator/History/Credentials), wraps every page via `app/layout.tsx` |
| `lib/tenant.ts` | `TENANT_SLUG` constant — single-tenant by design, see Section 3.18 |
| `lib/streams.ts` | `getActiveStream()` — picks the tenant's most recently created `enabled` stream, used by `/api/simulate` |
| `lib/remediation.ts` | Canonical CAEP-type → live Workflow name/SailPoint-action text the UI displays, plus per-scenario overrides (e.g. the reverse-direction Jamf scenario) |
| `prisma/migrations/20260729120000_add_audit_log_scenario_key/` | Adds nullable `AuditLog.scenarioKey`, so History can show real vendor/event names |
| `scripts/update-device-compliance-workflow.ts` | One-time: widened the device-compliance-change trigger filter, added the PRISM+AD scope + `Check Compliance Status` choice step (Section 3.18) |
| `scripts/update-device-compliance-description.ts` | One-time: updated that Workflow's own description text to match its new dual-direction behavior |
| `scripts/update-risk-level-change-email.ts` | One-time: added the "Get Identity's Manager" step and a branded HTML risk-detail body to the risk-level-change Workflow's previously-empty `Send Email` step (Section 3.19) |
| `middleware.ts` + `lib/supabase/middleware.ts` | Login gate for every page and `/api/*` route, explicitly excluding `/t/{slug}/...` (ISC's own protocol endpoints) -- Section 3.20 |
| `lib/supabase/server.ts` / `lib/supabase/client.ts` | Server-side and browser-side Supabase clients (anon key only -- `service_role` never appears here) |
| `app/login/page.tsx` | Email+password sign-in form. No self sign-up exists |
| `app/(portal)/layout.tsx` | Wraps Simulator/History/Credentials in `PortalShell`, redirects to `/login` if unauthenticated (defense-in-depth alongside middleware) |
| `scripts/add-user.ts` | The only way an account gets created -- run locally, uses `SUPABASE_SERVICE_ROLE_KEY`, never deployed |
| `scripts/reset-user-password.ts` | Updates an existing account's password -- same local-only, service_role-key pattern as `add-user.ts` |
| `scripts/check-audit-stream-ids.ts` | Read-only diagnostic used while root-causing the `NEXT_PUBLIC_APP_URL` bug — confirmed every send used the same stream ID, ruling out stream-selection as the cause |
| `.claude/launch.json` | Dev-server launch config so the app can be previewed via the browser-automation tooling (`npm run dev` on port 3000) |
| `prisma/schema.prisma`'s `VendorScenario` model | Vendor/event catalog moved from a static file into Postgres, so Admin > Catalog can add entries without a redeploy (Section 3.21) |
| `lib/vendorScenarios.ts` | DB access layer for the catalog: `listVendorScenarios()`/`getVendorScenario()`/`createVendorScenario()` (validates + normalizes claims per CAEP type, force-injects `initiating_entity` for token-claims-change)/`deleteVendorScenario()` |
| `scripts/seed-vendor-scenarios.ts` | One-time: migrated the original 15 static `lib/catalog.ts` scenarios into the new table, preserving their exact keys |
| `components/SimulatorClient.tsx` | The Simulator's interactive form, split out of `app/(portal)/page.tsx` (now a server component that fetches scenarios from the DB and passes them down) |
| `app/(portal)/admin/page.tsx` | Overview dashboard — 4 metric tiles, most-used vendor events, recent failures (last 10). Rewritten in Section 3.25 to aggregate across all tenants instead of one |
| `components/AdminNav.tsx` | Shared sub-nav for the Admin section (Overview / Catalog / Tenants tabs) |
| `app/(portal)/admin/catalog/page.tsx` + `components/CatalogManager.tsx` | Admin catalog page: lists scenarios, add-vendor form with per-CAEP-type dropdowns (no free-typed claim values), delete |
| `app/api/admin/scenarios/route.ts` + `app/api/admin/scenarios/[id]/route.ts` | Create/delete API routes backing the Catalog admin page |
| `lib/caep.ts`'s enum constants | `CURRENT_LEVEL_VALUES`/`CURRENT_STATUS_VALUES`/`CREDENTIAL_TYPE_VALUES`/`CHANGE_TYPE_VALUES`/`TOKEN_CLAIMS_INITIATING_ENTITY` — closed, spec-confirmed value lists shared by the Catalog form and server-side validation (Section 3.22) |
| `scripts/update-certification-campaign-emails.ts` | One-time: added the branded amber/gold HTML email to the credential-change, session-revoked, and token-claims-change Workflows (Section 3.23) |
| `lib/vault.ts` | Thin wrapper around Supabase Vault (`vault.create_secret`/`vault.decrypted_secrets` via parameterized `$queryRaw`) — used for signing-key private material only (Section 3.24) |
| `prisma/migrations/20260730144544_signing_key_vault_secret_id/` | Adds nullable `SigningKey.privateKeySecretId` |
| `prisma/migrations/20260730191005_drop_signing_key_plaintext_pem/` | Drops the now-unused `SigningKey.privateKeyPem` column, applied only after the corresponding code was live in production (Section 3.24) |
| `scripts/validate_key_migration.sh` | Reusable pre-drop validation gate script — kept as a historical record and a template for any future "moving a secret out of a plain column" migration |
| `lib/tenants.ts` | DB access layer for tenant CRUD: `listTenantsWithStatus()`, `createTenant()` (GUI wrapper around the same logic `scripts/provision-tenant.ts` already used) (Section 3.25) |
| `app/(portal)/admin/tenants/page.tsx` + `components/TenantManager.tsx` | Admin > Tenants panel — list + create form, shows the new tenant's Discovery URL/API token to paste into ISC |
| `app/api/admin/tenants/route.ts` | Create-tenant API route |
| `lib/tenant.ts`'s `getSelectedTenantSlug()` | Replaces the old hardcoded `TENANT_SLUG` constant — cookie-based, falls back to the first tenant created if nothing is selected |
| `app/api/tenant-selection/route.ts` | Sets the tenant-selection cookie, gated by the same auth middleware as every other `/api/*` route |
| `components/PortalShell.tsx` | Sidebar — now renders a real tenant switcher `<select>` instead of static text (Section 3.25) |

---

## 5. Decisions Made

- **Built greenfield instead of "productizing the existing SSF Signal
  Portal."** `How to Build the SSF Transmitter.md` explicitly recommends
  reusing an existing ~70%-complete app (`/Users/mgiblin/Projects/SSF
  Project`, assessed separately in `SSF Portal vs PRD Goals Assessment
  7.22.26.pdf`) rather than building new. **This session confirmed no
  access to that repository exists on this machine or account** — searched
  the full filesystem, found only assessment documents about it, not the
  code itself. Greenfield was the only viable path given that constraint,
  not a rejection of the source doc's recommendation. **If access to that
  original repo is ever obtained, it should be evaluated before further
  investment in this greenfield build**, since it may already solve
  problems (e.g. the `/ssf/verify` issue in Section 7) that this build is
  still working through from scratch.
- **Hosted SaaS, not a desktop app.** Non-negotiable, per the architecture
  assessment — ISC cannot discover/verify a laptop-only process.
- **Each SE deploys their own instance** (own free Vercel + own free
  Supabase project), rather than one shared central instance one person is
  responsible for maintaining. Rationale: no single point of ownership,
  no shared blast radius, avoids one person becoming the org's de facto
  infrastructure owner for a demo tool.
- **Postgres (Supabase), not SQLite**, even for local dev — matches the
  eventual deployment target exactly, avoids a dual-schema-provider
  headache in Prisma.
- **GitHub repo is Public.** Necessary to avoid Vercel's Hobby-plan private-
  repo collaboration block. Confirmed safe: no secrets were ever committed
  (`.env` git-ignored from the first commit onward, verified before every
  commit).
- **Migrations are a manual step, never run automatically on Vercel
  build.** Running `prisma migrate deploy` during the build (against the
  Transaction pooler) hangs indefinitely. `npm run migrate` must be run
  by hand, locally, against the Session pooler, whenever the schema
  changes.
- **Companion Workflow scoped to PRISM only, excluding HR.** A demo where
  the audience watches an *access* system get locked down live is the
  right story; disabling the HR system of record is not appropriate for a
  "security remediation" narrative and risks looking like a termination
  action.
- **Read-only API access is fine to use proactively; any write/mutating
  action against ISC requires explicit per-action permission from the
  user, shown before it runs.** Established explicitly after the user
  asked to clarify this boundary. Applies even though the available API
  credential (`company21912/.env.local`) is `ORG_ADMIN`-scoped and
  technically capable of far more.
- **`risk-level-change` was the first CAEP type proven**, even though
  SailPoint's own docs suggest `session-revoked` and `credential-change`
  have more mature native Workflow-template support (those two are the
  only ones named in SailPoint's public release notes with dedicated
  triggers/templates). Worth testing those two next for comparison.
- **(2026-07-27) Greenfield is now permanent, not provisional.** The
  earlier framing ("if access to the original SSF Signal Portal repo is
  ever obtained, evaluate it before further investment") is closed. The
  user confirmed staying on this greenfield build going forward regardless
  of whether that repo ever becomes accessible. Do not resurface this as
  an open question in future audits.
- **(2026-07-27) Supabase Vault + Supabase Auth will be adopted**, per the
  source doc's stack table, timed to land before/alongside the start of
  Phase 2 Simulator UI work — that's when a login system and stored
  secrets (signing keys, API tokens) first actually matter. Confirmed with
  the user; not yet implemented (see Section 7, items 12-13, and Section 9
  for sequencing).
- **(2026-07-27) Event-model branching design decision made** — see
  Section 7, item 5 for the resolution and remaining work.
- **(2026-07-28) Phase 0 and Phase 1 both confirmed complete**, and the
  Verify Connection gap explicitly reclassified as an external,
  non-blocking issue rather than an unfinished part of Phase 0. Real signal
  delivery (proven repeatedly) is treated as stronger evidence than the
  Verify handshake would be, since Verify is a synthetic check for the same
  thing. See Section 2 and Section 2.2.
- **(2026-07-28) Integration test harness built**, closing Phase 1's last
  gap. Vitest suite in `tests/integration/`, run via `npm test`, testing
  our own transmitter's endpoints/logic (not the real ISC tenant) using a
  local mock receiver to decode actual signed SET bytes. See Section 7,
  item 9.
- **(2026-07-28) Definition-of-Done reprioritized, criteria unchanged.**
  The two "NOT done" criteria (Verify Connection, ≥3 CAEP types) don't
  block calling Phase 0/Phase 1 done, but Definition of Done itself is
  still open and its literal criteria were not altered. The concrete next
  step to close it: test `session-revoked` and `credential-change` (2 more
  CAEP types). See Section 2.1's 2026-07-28 clarification note.
- **(2026-07-28) CAEP-type-per-Workflow design validated by actually
  building two more.** `device-compliance-change` built and fully proven
  end-to-end (Section 3.10); `token-claims-change` built and proven on the
  signal/trigger side, blocked only on an isolated ISC platform bug in the
  certification-campaign action (Section 3.12). Confirms the Section 7
  item 5 rescope decision was correct in practice, not just in theory.
- **(2026-07-28) Vendor-differentiation is confirmed closed, not just
  theorized.** Two direct experiments (custom claim in trigger filter;
  hardcoded vendor name in static Workflow text) — see Section 3.13 —
  either disproved the hypothesis or found real scaling limits. Do not
  re-attempt custom-claim-based vendor differentiation without genuinely
  new information (e.g. a SailPoint support answer that changes the
  premise).
- **(2026-07-28) Campaign-creation bug isolated to the Workflow action,
  not the tenant.** A manual A/B test (identical config, one via the
  Workflow's `Create Certification Campaign` action, one by hand through
  ISC's own Certifications UI) proved the campaign type/config is valid
  and supported — only the Workflow action's specific API call fails.
  **Superseded 2026-07-29**: this was not a platform bug after all — see
  below and Section 3.14.
- **(2026-07-29) SailPoint support cases: not being filed.** The user
  determined opening a support ticket with SailPoint is not an option for
  this project. The still-open `/ssf/verify` issue (Section 7 item 1) and
  its drafted case (`docs/sailpoint-support-case-verify-endpoint.md`)
  remain unsubmitted and should stay that way going forward — don't
  resurface "submit the support case" as a next step. The
  certification-campaign issue that prompted a second drafted case
  (`docs/sailpoint-support-case-certification-campaign.md`) turned out to
  have a real fix on our side anyway (Section 3.14), so that draft is now
  historical/unnecessary, not just unsubmitted.
- **(2026-07-29) `token-claims-change` certification-campaign bug fixed
  for real, not worked around.** What Section 3.12 described as a likely
  ISC platform bug was actually a fixable native-action misconfiguration:
  the template's `reviewerCertificationType: "ACCESS"` branch always
  searches the whole tenant (`query: "*"`), while the same action's
  `"IDENTITY"` branch correctly scopes to the triggering identity. Fixed
  by switching branches — no external API calls, no embedded credentials.
  See Section 3.14 for the full investigation. This closes Definition of
  Done criterion 4 outright (Section 2.1).
- **(2026-07-29) Rejected an `sp:http`-based workaround because it would
  have embedded OAuth client credentials in the Workflow's exported JSON.**
  Before the native-action fix (`reviewerCertificationType: "IDENTITY"`)
  was found, the fallback plan was an `sp:http` step calling ISC's own
  `/v3/campaigns` API directly. The user explicitly rejected this once it
  became clear it required embedding `CLIENT_ID`/`CLIENT_SECRET` as
  plaintext in the Workflow definition (visible to anyone with
  Workflow view/export access) — correctly, since it turned out a
  same-tenant native-action fix existed and didn't need this at all.
  **Precedent for future work**: don't reach for an `sp:http` step with
  embedded secrets as a first resort when a native action is misbehaving
  — check the action's own schema for alternate configuration branches
  first (see Section 3.14's "why this matters" note).
- **(2026-07-30) Vendor catalog moved from a static file to Postgres,
  deliberately kept tenant-agnostic/global.** A vendor scenario (e.g.
  "CrowdStrike: Host Isolated") means the same thing regardless of which
  ISC tenant it's sent against, so unlike `Tenant`/`Stream`/`AuditLog`,
  `VendorScenario` has no `tenantId` — one shared catalog across every
  tenant. This was a deliberate design choice made while scoping the
  multi-tenant work (Section 3.25), not an oversight; revisit only if a
  real need for per-tenant catalogs ever emerges.
- **(2026-07-30) Multi-tenant support scoped narrower than a full SaaS
  pivot, on purpose.** The alternative — one shared hosted instance many
  SEs log into, each seeing only their own tenant — was explicitly
  considered and not built. What shipped instead: one deployed instance
  can track and switch between multiple ISC tenants, but there is still
  no per-user access control tying a logged-in account to a specific
  subset of tenants. Any authenticated user of a given deployment can see
  and operate on every tenant registered to it. This matches the
  project's original "each SE/team deploys their own instance" model
  (Section 5, earlier decision) — it does not reverse it, it extends what
  one instance can do. **If per-user tenant isolation is ever needed,
  that's the real SaaS pivot this session deliberately avoided** — see
  Section 7 for what that would additionally require.
- **(2026-07-30) Signing keys moved to Supabase Vault; code deployed
  before the DB migration ran, not the other way around.** Explicitly
  reasoned through with the user when asked "is there a chance this
  breaks our environment?": Prisma Client and the actual DB schema must
  never disagree about a column's existence while the app is live, since
  every signal send touches `SigningKey`. Deploying the schema-updated
  code first (which simply stops selecting the column) makes the DB
  migration that drops it a no-op from the running app's perspective, no
  matter when it's applied afterward. Reversing that order — drop first,
  deploy second — would have broken every send in the gap. **Precedent
  for future work**: any migration that removes a column a live app
  reads must ship the code change first, migrate second, never the
  reverse.
- **(2026-07-30) The stale local `dev` branch was deleted and recut, not
  reused.** It predated this entire session (10 commits behind `main`,
  last touched during the Section 3.15-3.17 catalog work) and had zero
  unmerged commits of its own — everything on it had already landed in
  `main` long ago. Building new work on top of it would have meant
  branching from stale code. **Precedent for future work**: before
  reusing any existing branch, check `git log --oneline <branch>..main`
  first — don't assume a branch found via `git branch` is current.

---

## 6. Assumptions and Constraints

- **Vercel Hobby (free) plan**: blocks deployments from commit authors it
  can't verify as collaborators, *specifically on private repos*. No such
  restriction observed on public repos. This is a real constraint on the
  "each SE self-deploys free" model — worth re-testing if it changes.
- **Supabase free tier**: two connection modes matter — Session pooler
  (port `5432`, for migrations) vs Transaction pooler (port `6543`, for
  app runtime). Also: free Supabase projects **auto-pause after ~1 week of
  inactivity** — an SE returning to a stale demo may need to manually
  resume their project first. **Also confirmed (2026-07-30, while
  validating the signing-key Vault migration): the free tier does not
  include automated backups/point-in-time-recovery by default** — that's
  a paid-plan feature. Worth knowing before treating "Supabase has our
  back" as a safety net for any future destructive migration; the actual
  safety net on this tier is whatever manual backups get made by hand.
- **ISC's SSF Receiver only supports 5 CAEP event types**: `risk-level-
  change`, `credential-change`, `device-compliance-change`, `session-
  revoked`, `token-claims-change`. Never invent new SSF event type URIs.
- **Subject correlation is by `email` format** in this tenant's Receiver
  config (the alternative is `iss_sub`/account-ID-based, not used here).
- **ISC's delivery authorization credential expires (~48 hours observed)**
  and must be kept fresh via the `PATCH /ssf/streams` handler correctly
  capturing `authorization_header` on every refresh (fixed in this
  session, but worth monitoring — if signal sends start failing with 401
  "JWT is expired" again, run `scripts/check-stream-auth.ts <streamId>`
  first to confirm before assuming a new bug).
- **`NEXT_PUBLIC_APP_URL` is optional only when actually deployed on
  Vercel** (`VERCEL_PROJECT_PRODUCTION_URL` is a Vercel-injected variable
  that doesn't exist during local `npm run dev`) — locally it must always
  be set to the real deployed URL, never `localhost`, or every signed
  token's `iss`/`aud` will fail ISC's audience check while still returning
  a misleadingly-successful HTTP 202 (Section 3.18 — this was a real bug
  that broke every UI-triggered send until caught and fixed 2026-07-29).
  Don't set this to `localhost` again for "convenience" — ISC never talks
  to your local machine in this flow, so there's no actual benefit and a
  real cost.
- **RESOLVED 2026-07-29 (Section 3.18): a real portal/Simulator UI now
  exists**, deployed to production and proven end-to-end there. Every
  signal sent in this project *before* that point was triggered by a
  developer running `scripts/test-send.ts` from a terminal — that
  limitation is gone.
- **RESOLVED 2026-07-30 (Section 3.25): this is no longer a hardcoded
  single-tenant deployment.** `lib/tenant.ts`'s `TENANT_SLUG` constant is
  gone, replaced by a cookie-based `getSelectedTenantSlug()`. A
  single-tenant deployment still behaves identically (the fallback always
  resolves to the first/only tenant), but any deployment can now be
  provisioned with more via Admin > Tenants and switched between via the
  sidebar. **Still true**: there's no per-user tenant restriction — every
  authenticated user of a given deployment sees and can operate on every
  tenant registered to it (see Section 5's 2026-07-30 decision note).
- **If an SE ever pushes back and wants a "laptop-only" experience**, the
  source doc has an explicit, named answer for this, and it is not "build
  a local transmitter": *"the compromise is a thin local controller that
  calls the hosted transmitter API — never a local-only transmitter."*
  I.e., a small local app/CLI is an acceptable convenience layer that
  calls the real hosted API over the internet; a transmitter that lives
  only on a laptop is not acceptable under any circumstances, for the same
  discoverability reason established in Section 1. This has not come up
  again since the original PRD, but it's worth keeping as a fixed answer
  if it does.

### 6.1 What NOT to build (explicit guardrails from the source doc)

Reproduced verbatim in intent, since these are exactly the mistakes the
original (rejected) PRD made, and this project should not silently drift
back toward them over time:

- A Python desktop `.exe`/`.app` "SSF injector."
- A direct POST to a fictional ISC "Shared Signals webhook" — no such
  inbound endpoint exists; ISC only ever gives a transmitter an
  `endpoint_url` after *it* creates a stream against the transmitter's own
  discovery/management endpoints.
- 25 first-class, custom SSF/CAEP event type URIs. There are only 5
  supported types (Section 6), always. Vendor variety belongs in the
  catalog's claim content, never in new event-type URIs.
- Re-implementing identity correlation inside a custom Workflow. ISC
  already does subject-to-identity correlation natively; do not duplicate
  this logic anywhere in the transmitter or a Workflow.
- Poll-based delivery or a full subject-management API, unless a specific
  customer's Receiver actually requires it. Push delivery (what's built)
  is the default and, so far, the only tested/needed mode.

---

## 7. Open Issues

1. **`POST /ssf/verify` still fails ISC's "Verify Stream" UI action.**
   Root cause not fully identified despite ~6 distinct response-shape
   attempts (verbose body, empty body, `iss`/`aud`/`status`, full stream
   object, various HTTP status codes 200/202/204). ISC's error stopped
   giving specific detail ("Invalid response received from the
   transmitter") after the early attempts. **This does not block real
   signal delivery** (proven working independently), but the UI button
   itself never shows success. A support-case write-up is ready at
   `docs/sailpoint-support-case-verify-endpoint.md` — **submit it to
   SailPoint support or the Developer Community; do not keep guessing at
   response shapes without new information.**
2. **Only PRISM has been tested as a disable target.** Active Directory,
   IdentityNow, and HR accounts have not been exercised through the
   workflow (HR intentionally excluded; AD intentionally deferred, not
   yet added to the source-ID filter).
3. **UPDATED (2026-07-28): 3 of 5 vendor scenarios now tested end-to-end**
   (Okta/`risk-level-change`, Jamf/`device-compliance-change`, both fully
   proven including remediation; Zscaler/`token-claims-change` proven on
   the signal/trigger side, blocked on the campaign bug in item 14 below).
   Microsoft/`credential-change` and Proofpoint/`session-revoked` are
   defined in `lib/catalog.ts` but not yet sent/tested. The other 20
   scenarios across the ARD's full 25-scenario vendor scope remain
   concept-only.
4. **UPDATED (2026-07-28): 3 companion Workflows now exist**
   (`risk-level-change` → disable PRISM; `device-compliance-change` →
   disable PRISM; `token-claims-change` → create certification campaign,
   currently blocked — item 14). `session-revoked` and `credential-change`
   still have no Workflow built yet — next candidates, and both have
   confirmed SailPoint-native templates ("Remove Access When a Session is
   Revoked", "Remove Access When Credential Changes").
5. **FINAL RESOLUTION (2026-07-28): custom-claim Workflow branching is not
   achievable on this platform, by design — not a bug, not something a
   support case would fix. Rescoped to branch on CAEP event type instead.**

   **What was tried:** `lib/caep.ts`'s `CaepEventInput`/`buildCaepEvent()`
   were changed to emit three top-level fields inside the CAEP event object
   — `vendor`, `vendor_event_type`, `recommended_action` — matching
   `How to Build the SSF Transmitter.md`'s "Event model" section verbatim.
   A `choice`/"Switch" step (`Check Recommended Action`) was added to the
   live `SSF Injector Demo - Remove Access When Risk Level Changes`
   Workflow (id `d7ee6b95-7109-44fd-bfdc-240032ad5c29`), keyed on
   `$.trigger.ssfEvent.events["...risk-level-change"].recommended_action`,
   routing to the existing `Manage Accounts` (disable) step when it equals
   `"disable_account"`.

   **What actually happened, proven by a real execution trace:** ISC's
   Receiver strips `vendor`/`vendor_event_type`/`recommended_action` before
   the Workflow trigger ever sees them. The trigger's `ssfEvent.events[...]`
   object only ever contained the official CAEP `risk-level-change` schema
   fields (`current_level`, `previous_level`, `event_timestamp`,
   `principal`, `risk_reason`) — confirmed directly from ISC's own Event
   Log / Workflow execution history UI, twice, across two separate test
   sends. The `Check Recommended Action` step's comparison against
   `recommended_action` always evaluated `undefined`, so it always fell to
   its default branch.

   **Root cause, confirmed authoritative (not a guess):** OpenID SSF spec
   1.0 Final, Section 4.2.3: *"Transmitters MAY include additional fields
   in SSF events... **Receivers MUST ignore any fields they do not
   understand.**"* ISC is correctly following the spec. There is no claim
   placement (nested in the event object, or elsewhere) that a spec-
   compliant receiver is obligated to preserve. The one documented
   exception is the top-level `txn` claim (confirmed present under
   `$.trigger.ssfEvent.txn` per `workflow-triggers.html`), but its spec-
   defined meaning is "unique identifier correlating related SETs from one
   incident," not an arbitrary instruction string — repurposing it to carry
   `recommended_action` would be a semantic misuse and was rejected as an
   option.

   **Fix applied, restoring proven behavior:** `Check Recommended Action`'s
   `defaultStep` was changed from `"success 1"` to `"Manage Accounts"` —
   the branch now always disables PRISM regardless of `recommended_action`
   (since that claim can never arrive), matching the originally-proven
   always-disable behavior. Confirmed via a real test send: the Workflow
   correctly routed to `Manage Accounts` (visible in the execution trace as
   `"next": "Manage Accounts"`); the disable call itself then failed on
   that particular run due to an unrelated PRISM connector/VM timeout
   (environmental, VMs were down after-hours) — not a logic problem. Retest
   once the VMs are confirmed back up.

   **Decision, confirmed with the user (2026-07-28): rescope branching to
   CAEP event type, not custom claims.** ISC does preserve which CAEP type
   fired — that's the trigger mechanism itself, not a claim that can be
   stripped. Recommended design going forward:
   - Build one Workflow (or one branch) **per CAEP type actually tested**
     (`risk-level-change`, `session-revoked`, `credential-change`, ...),
     each with its own fixed, appropriate remediation action.
   - Vendor variety stays entirely in the **catalog/narrative layer** —
     many vendor scenarios (CrowdStrike, Okta, Palo Alto, ...) map onto the
     same CAEP type and trigger the same remediation for that type. The
     vendor-specific richness is what the SE sees and narrates during a
     demo (catalog `displayName`/`triggerCode`), not something that needs
     to reach ISC at all.
   - **Independent supporting evidence**: a screenshot of a peer's
     pre-existing SSF Signal Portal catalog UI (the ~70%-complete app named
     in Section 5/10.1, still inaccessible as code) shows exactly this
     pattern — many vendor rows across Okta/Palo Alto/etc., all mapped onto
     just the 5 CAEP types, with **no visible per-vendor action/branching
     column**. That team appears to have arrived at the same conclusion
     independently.
   - This directly reuses, rather than competes with, the work already
     needed to close the real Definition-of-Done gap (Section 2.1's
     2026-07-28 note): testing `session-revoked` and `credential-change` IS
     building the next 2 CAEP-type branches.
   - **This is a real, documented narrowing of the source doc's original
     ask.** The doc's Phase 2 backlog item 6 literally says "branch on CAEP
     type **+ vendor/`recommended_action`**" — we are keeping only the
     CAEP-type half. See the rescoped description on backlog item 6 in
     Section 9.1.
   - Catalog data structure (`vendor`, `displayName`, `triggerCode`,
     `ssfEventType`) is still not built (`scripts/test-send.ts` still
     hardcodes one scenario inline) — remains open, see item 6 below.
6. **RESOLVED 2026-07-29 (Section 3.18): a real Simulator UI/SE-facing
   surface now exists**, deployed to production and independently
   verified there. Status against the source doc's "Minimum viable SE
   surface" (Section 3 of `How to Build...`), updated:
   - **Credentials** — ✅ built. Read-only Discovery URL + API token
     display with Show/Copy. Provisioning a *new* tenant is still a
     one-time CLI step (`provision-tenant`), deliberately out of scope for
     this pass.
   - **Simulator** — ✅ built. Vendor → event → subject → Send Now, live
     JSON preview, real HTTP result.
   - **History** — ✅ built. Real `AuditLog` data, vendor/event name shown
     via the new `scenarioKey` column.
   - **Admin catalog** — **RESOLVED 2026-07-30 (Section 3.21)**. Vendor
     scenarios now live in a `VendorScenario` Postgres table, and Admin >
     Catalog adds/deletes them through the UI — no code change, no
     redeploy. Verified live: a scenario added through the form appeared
     in the Simulator immediately.
   Nice-to-haves still unbuilt: saved demo identities/picker, countdown/
   queued sends, companion Workflow JSON templates (see item 9 below), and
   preview-matches-wire-payload (arguably now satisfied in spirit by the
   Simulator's live JSON preview panel, though not literally comparing
   against a captured wire payload).
   **This was the single largest gap in the project relative to its stated
   purpose** ("lets Solutions Engineers inject..." — not developers).
   **UPDATE 2026-07-30: fully closed.** All 4 pieces of the "minimum
   viable SE surface" (Credentials, Simulator, History, Admin catalog) are
   now built and live. Tenant provisioning also moved from CLI-only to a
   real Admin > Tenants panel the same session (Section 3.25), closing
   the one caveat left on the Credentials bullet above too.
7. **The original "Threat Signal Transmitter" Receiver/Stream (the first
   one created, before "v2") still exists in ISC with a permanently
   expired authorization credential.** It was not deleted — only a second,
   working one ("Threat Signal Transmitter v2") was created alongside it.
   Decide whether to delete the stale one or leave it as a reference.
8. **`scripts/test-send.ts` is hardcoded**, not parameterized via CLI args
   for tenant/subject/event type. Fine for continued manual testing, but
   should become real Simulator UI inputs in Phase 2.
9. **RESOLVED (2026-07-28): automated integration test harness built.**
   `How to Build the SSF Transmitter.md` listed this under both Phase 1
   ("Integration tests: discovery, stream create, verify SET, signed send")
   and the ordered backlog (item 8). Now covered by a Vitest suite in
   `tests/integration/` (`discovery.test.ts`, `streams.test.ts`,
   `send-signal.test.ts`, `auth.test.ts`), run via `npm test`. 24 tests,
   all passing as of this writing. It tests our transmitter's own
   endpoints/logic directly (route handlers + `lib/ssf.ts`) against a real
   Postgres tenant and a local mock HTTP receiver (`tests/helpers/
   mock-receiver.ts`) that captures and decodes the actual signed SET bytes
   — this is what catches claim-shape regressions like the missing
   `sub_id`/`aud` bugs (Section 3.5, items 9-10) and the token-rotation bug
   (item 12), rather than just trusting that a `fetch()` call didn't throw.
   It does **not** call the real ISC tenant — that would require live
   credentials and network access in CI, and isn't what "integration test"
   means here; it means testing across our own layers (route → lib →
   signed wire payload), not literally against SailPoint. The old manual
   diagnostic scripts (`scripts/check-*.ts`, `list-streams.ts`) remain
   useful for live-tenant debugging and were kept, not replaced.
10. **The companion Workflow is not packaged as an importable artifact.**
    The source doc's Phase 2 scope and backlog (item 6, "Companion Workflow
    pack — importable ISC Workflow JSON templates") calls for a
    downloadable/importable JSON file another SE could bring into their own
    ISC tenant. What exists instead is a live, manually-configured Workflow
    inside the `company21912-poc` tenant only — built by hand, from a
    template, following the steps in Section 10.4. Another SE cannot reuse
    it without redoing those manual steps themselves (including the easy-to-
    miss "enable it" step and the PRISM source-ID filter edit). **Exporting
    this Workflow as JSON (ISC's Workflow builder has a download icon next
    to "Workflow Details" — seen but not yet used in this session) and
    committing it to `workflow/` in the repo is a concrete, fast win** that
    directly closes this gap.
11. **Source-doc backlog items not started at all:** "Preview = wire
    payload" (no UI to preview anything in), "Identity picker" (no UI),
    "Scheduler/demo queue" (no UI). All correctly deferred to Phase 2/the
    Simulator UI — listed here only so they're not silently forgotten.
12. **Phase 3 ("SE org scale") — 2 of 4 requirements now done.** The
    source doc names four: **multi-tenant isolation** — **UPDATE
    2026-07-30**: a single deployed instance can now register, switch
    between, and operate on multiple real ISC tenants (Section 3.25),
    tested with a second real tenant end-to-end (not just schema-shaped
    anymore). Still missing from "isolation" specifically: no per-user
    restriction — every authenticated user of a deployment can see every
    tenant registered to it (Section 5's 2026-07-30 decision note; this
    is the real remaining gap if per-SE-account isolation is ever
    needed). **Vault-backed secrets** — **DONE 2026-07-30** (Section
    3.24), see item 13 below. **Admin analytics** — **DONE 2026-07-30**,
    the Admin Overview dashboard (Section 3.21) is exactly this: signals
    sent, success rate, most-used vendor events, recent failures, now
    aggregated across all tenants. **MFA** — still not started; deferred
    by explicit user choice, not forgotten (Section 6). This is now the
    only one of the four still open.
13. **One of two named stack pieces from the source doc has now been
    adopted:**
    - **Supabase *Vault*** for secrets — **DONE 2026-07-30 (Section
      3.24)**. Signing key private material is stored exclusively in
      Supabase Vault; the plaintext PEM column was dropped after a live
      pre/post-drop verification. `apiToken` (the credential ISC presents
      back to us) is still plain Postgres — lower sensitivity than the
      RS256 private key (it authenticates one specific stream/tenant
      relationship, not the ability to forge signatures for one), not
      moved in this pass, worth reconsidering later if this ever handles
      real customer tenants rather than demo orgs.
    - **Supabase *Auth*** (+ optional TOTP MFA) for SE portal login —
      still done without MFA (Section 3.20), by explicit user choice, not
      an oversight.
14. **RESOLVED (2026-07-29). Was: `token-claims-change` Workflow's
    `Create Certification Campaign` step consistently failing.** Full
    detail in Section 3.14, which supersedes the "platform bug" framing
    below (kept for the historical record of how the investigation
    unfolded). Original summary from 2026-07-28:
    - Error (from `GET /beta/workflow-executions/{id}/history`, verbatim):
      `"campaign id: <id> has error status (type: Campaign creation
      failed, retryable: false)"`. Reproduced twice, different campaign
      IDs both times — not transient.
    - The signal → correlate → trigger → `Get Identity`/`Get Identity's
      Manager` chain all work correctly; only the campaign-creation call
      itself fails.
    - **Ruled out**: empty certification scope (Jayme Cannon has 5 real
      AD entitlements, confirmed in the UI).
    - **Isolated via a manual A/B test**: an identical campaign
      (Individual reviewer = Martena Heath, target = Jayme Cannon,
      "Certify all access") built by hand through ISC's own Certifications
      UI **succeeded** with zero errors.
    - **What this actually turned out to be (2026-07-29)**: not a platform
      bug. The native action's `reviewerCertificationType: "ACCESS"`
      branch (what the template ships with) always builds an
      unconstrained `searchCampaignInfo.type: "ACCESS"` + `query: "*"`
      request — a tenant-wide search that exceeds the 10,000-item guard
      regardless of identity scope. Switching to `reviewerCertificationType:
      "IDENTITY"` fixes it completely, using only native actions. See
      Section 3.14 for the full investigation and fix.
    - **No SailPoint support case was filed for this** — the user
      determined submitting a support case wasn't an option, and the real
      fix was found before one would have been needed anyway. See Section
      5's 2026-07-29 decision note.

---

## 8. Risks or Warnings

- **Jayme Cannon's PRISM account state changed hands many times on
  2026-07-28** (disabled by `risk-level-change` and `device-compliance-
  change` test runs, re-enabled by the user each time). As of this
  writing it was last confirmed **re-enabled** by the user after the
  `device-compliance-change` retest. `token-claims-change` tests do not
  touch account state at all (they only attempt certification campaign
  creation, which fails before any access change). **Still, always check
  and manually re-enable if needed before any further testing or a real
  demo** — via her Accounts tab → PRISM row → "..." → Enable Account, or
  `npx tsx scripts/check-prism-account.ts` to check programmatically.
- **A destructive `taskkill /F /IM node.exe` was run earlier in this
  project** (not in this final session, but worth knowing) to stop a
  local dev server, which killed *all* Node processes on the machine, not
  just the intended one — including one that was already running before
  this project started. If any other Node-based tool/app was relied upon
  separately, it may have been killed unexpectedly at that point in the
  project's history.
- **The GitHub repo is Public.** No secrets are in it (verified
  repeatedly), but the architecture, code, and commit history are visible
  to anyone. Acceptable per the decision in Section 5, but worth
  re-confirming if this project's visibility posture should change later.
- **The `company21912/.env.local` API client is `ORG_ADMIN`-scoped** —
  powerful, tied to a real admin's identity. It has only been used for
  reads in this session. Any future use for writes must get explicit,
  per-action confirmation, shown before execution — this was an explicit
  user requirement, not optional.
- **Free-tier infrastructure (Vercel Hobby, Supabase free)** means no
  uptime guarantees, no team collaboration on the private-repo path, and
  possible cold-start pausing. Fine for a demo tool; would need
  re-evaluation before any "official," org-wide rollout.
- **RESOLVED 2026-07-30: signing keys are no longer plaintext PEM in
  Postgres.** They live exclusively in Supabase Vault now
  (`SigningKey.privateKeySecretId`, Section 3.24) — the old
  `privateKeyPem` column no longer exists in the schema at all. A manual
  local export of the one legacy key was made before the column was
  dropped, kept outside the repo, in case it's ever needed for recovery.
- **No per-user tenant isolation.** Any authenticated user of a given
  deployment can see and operate on every tenant registered to it
  (Section 5's 2026-07-30 decision note, Section 7 item 12). Not a bug —
  a deliberate scoping decision for this pass of multi-tenant work — but
  worth knowing if this deployment is ever shared with someone who
  shouldn't see every tenant's Discovery URL/API token/audit history.
- **Supabase free tier has no automated backups/PITR by default**
  (confirmed 2026-07-30 while validating the signing-key migration — see
  Section 6). Any future destructive migration on this project should
  assume there is no infrastructure-level safety net unless someone has
  since upgraded the plan or set up manual backups.

---

## 9. Exact Next Steps

**UPDATE 2026-07-30 — read this before the tables below, some of which are
now historical.** Most of what this section used to list as open is done:
the Simulator/History/Credentials/Admin catalog UI (all 4 pieces of the
"minimum viable SE surface"), tenant provisioning through the portal,
Vault-backed signing keys, and admin analytics (the Overview dashboard).
**What's genuinely still open, in priority order, as of this handoff:**
1. **Companion Workflow JSON export** (backlog item 6, Section 9.1) — no
   importable artifact exists yet for another SE to bring these 5
   Workflows into their own ISC tenant. Still the most concrete, bounded
   win left.
2. **Per-user tenant isolation**, only if actually needed — every
   authenticated user of a deployment currently sees every tenant
   registered to it (Section 7 item 12, Section 8). Not started because
   it hasn't been asked for; would be a real architectural addition, not
   a small task, if it ever is.
3. **The stale v1 Receiver/Stream** in ISC — still not deleted, still
   undecided (Section 7 item 7).
4. **`middleware.ts` → `proxy.ts` rename** — cosmetic, not urgent
   (Section 3.20).
5. **MFA** — explicitly deferred by user choice (Section 6), not
   forgotten.
6. **Verify Connection (`/ssf/verify`)** — permanently blocked, not
   something further work will fix. Do not resurface "submit the support
   case" (Section 5, Section 9.0 item 5).

Immediate housekeeping first, then **explicitly mapped to `How to Build the
SSF Transmitter.md`'s own "Suggested backlog (ordered)"**, since that
document's priority order should govern what "next" means here rather than
this session's improvised order. (Reading below this point is historical
detail on how each backlog item's status evolved — the summary above is
the accurate current state.)

### 9.0 Immediate housekeeping (do first, takes minutes)

1. **Re-enable Jayme Cannon's PRISM account** in ISC if it's still
   disabled (Accounts tab → "..." → Enable Account).
2. **Decide the fate of the original (v1) Receiver/Stream** in ISC — delete
   it, or leave it as a known-broken reference. It currently has an
   expired credential and cannot send signals.
3. **DONE, then found not to work as designed, then fixed (2026-07-28) —
   see Section 7 item 5 for the full story.** A `choice` step was added to
   the live Workflow keyed on `recommended_action`; ISC was confirmed to
   strip that claim per spec, so the step's `defaultStep` was changed to
   always route to `Manage Accounts`, restoring the proven always-disable
   behavior. No further action needed here — future work in this area is
   the CAEP-type-branching rescope (Section 7 item 5, backlog item 6).
4. **RESOLVED (2026-07-28): retested once the VMs were back up — worked
   cleanly.** PRISM disable succeeded, confirming the earlier failure was
   purely the after-hours VM outage, not a code/logic issue.
5. **RESOLVED, direction changed (2026-07-29): no SailPoint support cases
   will be filed** — the user decided this is not an option for this
   project (Section 5). The certification-campaign issue that would have
   prompted a second case was fixed directly instead (Section 3.14). The
   `/ssf/verify` case (item 1) remains open but unsubmitted, and should
   stay that way — don't resurface "submit it" as a next step.
6. **DONE (2026-07-29), optional to extend further: build and test the 2
   remaining CAEP-type scenarios** already defined in `lib/catalog.ts` —
   `credential-change`/Microsoft and `session-revoked`/Proofpoint. Both
   need a companion Workflow built first (follow Section 3.10's
   now-proven API-build pattern — find the trigger ID via
   `scripts/list-trigger-definitions.ts`, build with the correct
   `filter.$` key, verify via `scripts/check-trigger-subscriptions.ts`).
   This isn't required to close Definition-of-Done criterion 4 (3 types
   already sent), but rounds out the catalog and gives more redundancy in
   case the `token-claims-change` bug takes a while to resolve.

### 9.1 Source doc's ordered backlog — status and next action on each

| # | Backlog item (source doc's order) | Status | Next action |
|---|---|---|---|
| 1 | Verify gate — end-to-end ISC Receiver Verify Connection + one successful SET | **Blocked** | Submit the drafted support case (`docs/sailpoint-support-case-verify-endpoint.md`) to SailPoint Support/Developer Community. Stop guessing response shapes without new information. |
| 2 | Stream status gating — never push to paused/disabled streams | **Done** | `sendSsfSignal()` in `lib/ssf.ts` already throws `StreamNotActiveError` for non-enabled streams. No action needed. |
| 3 | Preview = wire payload — SE sees exactly what ISC receives | **Not started** | Blocked on the Simulator UI existing at all (Phase 2). |
| 4 | Identity picker — saved demo subjects (email / `iss_sub`) | **Not started** | Same — Phase 2 UI work. |
| 5 | Catalog expansion — PRD narratives mapped onto supported CAEP types | **In progress (2026-07-28)** | 5 of 25 target scenarios (ARD Section 6.1) now in `lib/catalog.ts`, one per CAEP type. 3 sent and tested (2 fully proven, 1 blocked on Section 7 item 14's platform bug). Directly closes the "at least 3 CAEP types" definition-of-done criterion (Section 2.1) modulo that one open bug. Next: send/test the 2 remaining catalog scenarios (`credential-change`/Microsoft, `session-revoked`/Proofpoint) — both need a Workflow built first (Section 10.4-style, or via API per Section 3.10's now-proven pattern). |
| 6 | Companion Workflow pack — importable ISC Workflow JSON templates | **Partial, rescoped (2026-07-28)** | 3 Workflows now exist (risk-level-change, device-compliance-change, token-claims-change), all live only inside `company21912-poc`, none exported. **Rescoped from the doc's literal "branch on CAEP type + vendor/`recommended_action`" to branch on CAEP type only** — custom-claim branching confirmed not achievable at any stage, including trigger filters (Section 3.13). Plan: build/export one Workflow per tested CAEP type, not one generic branching Workflow. **Action: use the download icon next to "Workflow Details" in ISC's Workflow builder to export each Workflow as JSON, commit them to a new `workflow/` folder in the repo.** |
| 7 | Scheduler / demo queue — countdown or multi-step script sends | **Not started** | Phase 2 UI work. |
| 8 | Integration test harness — discovery, streams, verify, signed delivery | **Done (2026-07-28)** | Vitest suite in `tests/integration/`, run via `npm test`. 24 tests covering discovery, JWKS, stream create/GET/PATCH, auth boundaries, and signed-SET claim shape via a local mock receiver. See Section 7, item 9. |

### 9.2 Broader next steps beyond the backlog

**UPDATE 2026-07-29 (later session): item 10 (the Simulator UI) is DONE**
— see Section 3.18. It's live in production, proven end-to-end there, and
this was re-confirmed as the top priority before being built, exactly as
the note below (written earlier in the day) said to. The paragraph below
is kept for the historical reasoning, but don't treat "build the Simulator
UI" as still-open — the new top priority is whichever of items 9, 11, 12
below, or the Admin catalog piece (Section 7 item 6), matters most next.

As of earlier the same day, **the highest-priority item was the Simulator
UI (item 10 below)** — confirmed directly with the user, because every
other gap (more CAEP types, more Workflows) only deepens the *backend*,
while zero of it is usable by an actual SE until some UI exists.

9. **RESOLVED (2026-07-28) — see Section 7, item 5.** The event-model
   design decision is made: catalog entries map to a CAEP event type (not a
   custom `recommended_action` claim a Workflow branches on, which was
   tested and confirmed not achievable). Build the catalog's data model
   around `vendor`, `displayName`, `triggerCode`, `ssfEventType` (per the
   source doc's "Catalog fields to lock"), and plan one Workflow per tested
   CAEP type rather than one generic branching Workflow.
10. **DONE (2026-07-29, Section 3.18).** The Simulator UI is built,
    deployed, and proven end-to-end in production — vendor grid, event
    picker, subject field, Send button, live JSON preview, real result.
    Backlog items 3 and 4 (Section 9.1) are effectively satisfied by the
    live preview panel and the plain-text subject field respectively; item
    7 (scheduler/queue) remains unbuilt, low priority. The "minimum viable
    SE surface" spec in Section 7 item 6 is done for 3 of its 4 pieces —
    only the Admin catalog piece (add/edit scenarios without a redeploy)
    is still open.
11. **Write the full external onboarding guide** for other SEs — this
    runbook plus the README are internal/technical; a polished, SE-facing
    step-by-step (screenshots, no jargon) is still needed, matching what
    was promised earlier in this project. Once backlog item 6 (importable
    Workflow JSON) is done, that guide gets meaningfully shorter and more
    reliable — "import this file" beats "manually rebuild these 9 steps."
12. **Expand the vendor/payload catalog** beyond the single tested
    CrowdStrike scenario, per the ARD's full 25-scenario scope (5 vendors ×
    5 scenarios each), all still mapped onto the 5 supported CAEP types.
    This naturally follows from, and should reuse, the catalog data model
    decided in item 9.

---

## 10. Instructions for the Next Person

### 10.1 Sources to read first (in this order)

1. `docs/How to Build the SSF Transmitter.md` — the architecture decision
   record; explains *why* this is a hosted app and not a desktop app.
2. `ARD SSF Injector.docx` (in the parent `SSF Signals Portal Projects`
   folder, not inside the repo) — the formal requirements spec this build
   follows.
3. `SailPoint_SSF_Transmitter_Design.docx` v2.0 (same parent folder) — the
   detailed design doc, section-mapped against the ARD.
4. This runbook (`docs/HANDOFF_RUNBOOK.md`).
5. `README.md` in the repo root — deployment instructions.
6. External references used throughout:
   - https://documentation.sailpoint.com/saas/help/shared_signals/index.html
   - https://documentation.sailpoint.com/saas/help/shared_signals/managing_receivers.html
   - https://openid.net/specs/openid-sharedsignals-framework-1_0-final.html
   - OpenID CAEP specification (search "OpenID Continuous Access
     Evaluation Profile 1.0 final" — required-claims and enum values,
     e.g. uppercase `"HIGH"`/`"LOW"` for `current_level`/`previous_level`,
     came from here)
   - https://documentation.sailpoint.com/saas/help/workflows/ (workflow
     action schemas, e.g. the `Get Accounts` action's output fields
     including `sourceId`)
   - https://caep.dev — third-party SSF/CAEP payload validator (2026-07-28,
     via a peer working a parallel SSF Signal Portal build). Lets you test
     an SSF/CAEP transition and see schema errors directly, without needing
     a live ISC tenant round-trip. Not yet used in this project, but worth
     reaching for next time a payload/response-shape issue needs debugging
     (e.g. the still-unresolved `/ssf/verify` issue, Section 7 item 1, or
     building the `session-revoked`/`credential-change` payloads) — ISC's
     own error messages have repeatedly been too vague to debug from alone.
7. **Related artifacts named in `How to Build the SSF Transmitter.md`'s own
   "Related artifacts" section** — listed here for completeness even where
   this session did not have direct access to them:
   - `PRD - Shared Signals Injector 7.22.26.docx` — the original PRD (this
     session worked from a copy titled "Shipwright's Corner - Tack 1")
   - `SSF Injector PRD Assessment - Go No-Go 7.22.26.pdf` — the Go/No-Go
     decision record (not directly reviewed in this session; the
     `How to Build...` doc summarizes its conclusion)
   - `SSF Portal vs PRD Goals Assessment 7.22.26.pdf` — reviewed directly
     in an earlier part of this session; assessed the (inaccessible)
     existing SSF Signal Portal against the original PRD's goals
   - `/Users/mgiblin/Projects/SSF Project` (SSF Signal Portal) — **the
     pre-existing, ~70%-complete implementation this project was told to
     productize instead of rebuilding. No access to this repository was
     available in this session. Obtaining access to it should be a
     priority for whoever picks this up next** — see the decision note in
     Section 5.

### 10.2 How to recreate this environment from scratch

1. Clone the repo: `git clone https://github.com/alexajamescrisfield-byte/ssf-transmitter.git`
2. `npm install` (runs `prisma generate` automatically via `postinstall`).
3. Create your own free Supabase project. Get its connection string
   (Project Settings → Database → Connection string → URI). **Disable**
   "Automatically expose new tables" if prompted.
4. Create a local `.env` file (not committed):
   ```
   DATABASE_URL="<Supabase Session pooler string, port 5432>"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
5. Run `npm run migrate` (applies the schema to your Supabase Postgres).
6. Switch `.env`'s `DATABASE_URL` to the **Transaction pooler** (port
   `6543`) for normal use.
7. Deploy to Vercel: import the GitHub repo, set the `DATABASE_URL` env
   var to the Transaction pooler string, leave `NEXT_PUBLIC_APP_URL`
   unset (auto-detected). Deploy.
8. Provision a tenant — **two ways, same result** (2026-07-30): either the
   CLI script:
   ```
   npm run provision-tenant -- <your-tenant-slug> "<Human Readable Name>"
   ```
   or, once logged into the deployed app, **Admin > Tenants > Add tenant**
   in the UI. Both generate an **API Token** and a **Discovery URL** — the
   UI shows them once right after creation; the Credentials page (for
   whichever tenant is selected in the sidebar switcher) shows them again
   anytime after.

### 10.3 How to wire a tenant into a real ISC org (Phase 0 gate)

1. In ISC admin console: **Admin → Connections → Shared Signals**.
2. **Create New** (or if a Receiver already exists for this purpose, open
   it via **Actions → Edit**).
3. **Base Configuration**: give it a name/description.
4. **Connection Settings**:
   - Authentication Type: `API Token`
   - API Token: the one `provision-tenant` printed
   - Discovery URL: `https://<your-deployed-url>/t/<slug>/.well-known/ssf-configuration`
   - Event Types: pick at least `Risk Level Change`
   - Stream Status: `Enabled` (if the field is present)
5. **Subject ID Format**: leave as "Use the identity's email attribute"
   unless you specifically need `iss_sub` correlation.
6. Save, then click **Create Stream** at the top.
7. Find the new stream's ID: `npx tsx --env-file=.env scripts/list-streams.ts <slug>` — take the newest `createdAt`.
8. Send a real test signal:
   ```
   NEXT_PUBLIC_APP_URL="https://<your-deployed-url>" npx tsx --env-file=.env scripts/test-send.ts <streamId>
   ```
   (Edit `scripts/test-send.ts` first if you need a different tenant slug
   or subject email than the current hardcoded `company21912-poc` /
   `Jayme.Cannon@sailpointdemo.com`.)
9. Check ISC's Receiver → **Event Log** — should show status
   **"Correlated"** for the identity, with a `Risk Level Change` event
   type.

### 10.4 How to build the companion Workflow (matches what was done)

1. **Admin → Workflows → Create New** (or find "Threat Detection" template
   category).
2. Select the template **"Remove Access When Risk Level Changes"**.
3. Confirm/edit the Workflow Details (name/description), click **Continue
   to Builder**.
4. The template pre-builds: Trigger (`CAEP Risk Level Change Events`) →
   `Get Identity` → `Get Identity's Accounts` → `Disable Accounts` → End.
   Confirm "No validation errors detected" at the bottom.
5. **To scope which accounts get disabled** (recommended — don't disable
   HR): click the `Disable Accounts` step. In "Select Accounts", replace
   the default `$.getAccounts.accounts[*].id` with a filtered expression:
   ```
   $.getAccounts.accounts[?(@.sourceId=="<SOURCE_ID>")].id
   ```
   Find a source's ID via **Admin → Connections → Sources**, click into
   the source, and read the GUID from the browser URL
   (`.../sources/<GUID>/view/accounts`). Use `||` to OR-combine multiple
   sources if needed.
6. Click **Save**.
7. **Critical, easy-to-miss step:** go back to the **Workflows list view**
   and confirm the workflow's status is **Enabled**, not Disabled — new
   workflows from a template are created disabled by default and will
   silently never fire until you flip this.
8. Re-run the test signal (Section 10.3 step 8) and confirm the target
   account actually flips to Disabled in the identity's Accounts tab.
9. To reset for repeated testing: Accounts tab → target account → "..." →
   **Enable Account**.

### 10.5 Useful diagnostic commands

All run from the `ssf-transmitter` directory with `--env-file=.env`:

```bash
# List all streams for a tenant, with IDs and delivery URLs
npx tsx --env-file=.env scripts/list-streams.ts <slug>

# Check whether recent signal sends actually succeeded (HTTP status from ISC)
npx tsx --env-file=.env scripts/check-audit.ts

# Check a stream's stored authorization credential and whether it's expired
npx tsx --env-file=.env scripts/check-stream-auth.ts <streamId>

# Look up real ISC identities via the company21912 API client (read-only)
npx tsx scripts/list-isc-identities.ts

# Send any catalog scenario (now DB-backed, see lib/vendorScenarios.ts -- lib/catalog.ts is historical/seed-only) -- run with no args to list all
npx tsx --env-file=.env scripts/send-scenario.ts <streamId> <scenarioKey>

# List every CAEP trigger's exact id -- use before wiring a new Workflow via API
npx tsx scripts/list-trigger-definitions.ts

# List every Workflow's live trigger registration + actual stored filter
npx tsx scripts/check-trigger-subscriptions.ts

# Check a Workflow's most recent execution status (defaults to risk-level-change Workflow)
npx tsx scripts/check-workflow-execution.ts [workflowId]

# Full step-by-step execution history for one run (found via trial, not documented by SailPoint)
npx tsx scripts/check-execution-detail.ts <workflowId> <executionId>

# Pre-drop validation gate for the signing-key Vault migration (2026-07-30) --
# reusable template for any future "move a secret out of a plain column" migration
bash scripts/validate_key_migration.sh
```

If signal sends start failing with `401` / `"JWT is expired"`, run
`check-stream-auth.ts` on the stream in question first — if expired, the
fix is a fresh stream (Section 10.3 steps 6-8), not a code change (the
rotation bug that caused this was already fixed in this session).
