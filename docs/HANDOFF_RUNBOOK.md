# Threat Signal Transmitter (TST) — Handoff Runbook

**Date of this handoff:** 2026-07-27
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

**No SE-facing UI exists yet.** All testing so far has been done via
command-line scripts run by the developer, not by an SE clicking buttons.
That's Phase 2 work, not started.

### 2.1 "Definition of Done" — status against `How to Build the SSF Transmitter.md`

That source document defines exactly what "done" means for this project.
Checking each criterion honestly, **this project is not yet complete**:

| Definition-of-done criterion | Status |
|---|---|
| Provision a tenant in the portal | **Partial** — a tenant can be provisioned, but only via a CLI script (`scripts/provision-tenant.ts`), not "in the portal," because no portal exists yet |
| Wire SailPoint ISC via Discovery URL + API token | **Done** |
| Pass Verify Connection | **NOT done** — this is the unresolved `/ssf/verify` issue (Section 7, item 1). The source doc lists this as the literal #1 item in its "Suggested backlog (ordered)" |
| Send at least 3 CAEP types from realistic vendor stories | **NOT done** — only 1 of the 5 supported CAEP types (`risk-level-change`) has been tested end-to-end. The doc's bar is at least 3 |
| Show a Workflow remediation in ISC | **Done** — PRISM account disable, confirmed live |

**Bottom line: 2 of 5 definition-of-done criteria are fully met, 1 is
partial, 2 are not done.** Do not treat this project as complete based on
Section 2's "Phase 0 gate: PROVEN" framing alone — that refers to the
*protocol* working, which is necessary but not sufficient for the actual
definition of done in the source document. See Sections 7 and 9 for exactly
what's left.

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

---

## 4. Files Created or Modified

All paths relative to `SSF Signals Portal Projects/ssf-transmitter/` unless
noted.

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Data model: `Tenant` (slug, apiToken, name), `SigningKey` (RS256 keypair per tenant, private key in DB — flagged as needing a real vault before production use), `Stream` (deliveryEndpointUrl, eventsRequested, status, authorizationHeader), `AuditLog` (every send attempt, success/fail) |
| `prisma/migrations/20260723000000_init/migration.sql` | Initial Postgres schema migration |
| `lib/prisma.ts` | Prisma client singleton, wired to `@prisma/adapter-pg` using `DATABASE_URL` |
| `lib/caep.ts` | The 5 supported CAEP event type URIs, their required-claims map, `buildCaepEvent()` claim builder that throws `MissingCaepClaimsError` if required claims are absent |
| `lib/keys.ts` | RS256 keypair generation per tenant (`getOrCreateSigningKey`), PEM import helper |
| `lib/auth.ts` | `requireTenantByBearerToken()` — validates ISC's bearer token against the tenant's stored `apiToken` |
| `lib/ssf.ts` | Core transmitter logic: `appBaseUrl()` (auto-detects Vercel's production URL), `tenantIssuer()`, `ssfConfigurationDocument()`, `sendSsfSignal()` (build claims → sign SET with `sub_id`+`aud` → POST to stream's `deliveryEndpointUrl` → audit log), `sendVerificationSet()` (same, for the verify handshake) |
| `app/t/[slug]/.well-known/ssf-configuration/route.ts` | GET discovery document |
| `app/t/[slug]/.well-known/jwks.json/route.ts` | GET public signing key |
| `app/t/[slug]/ssf/streams/route.ts` | GET (list/by id)/POST (create)/PATCH (refresh — captures `authorization_header` rotation) |
| `app/t/[slug]/ssf/status/route.ts` | GET/POST stream status |
| `app/t/[slug]/ssf/verify/route.ts` | POST verify handshake — **still unresolved response shape**, see Section 7 |
| `scripts/provision-tenant.ts` | CLI: `npm run provision-tenant -- <slug> "<name>"` — creates a tenant + signing key |
| `scripts/test-send.ts` | CLI smoke test: sends a real `risk-level-change` SET. Currently hardcoded to `tenantSlug: "company21912-poc"` and `subjectEmail: "Jayme.Cannon@sailpointdemo.com"` — **not yet parameterized**, edit the file directly to test a different tenant/identity |
| `scripts/mock-receiver.mjs` | Throwaway local HTTP listener used for early local-only testing (no longer needed against the real tenant, kept for reference) |
| `scripts/check-audit.ts` | Dumps recent `AuditLog` rows — useful to check whether a push actually succeeded (`httpStatus`/`success`) independent of ISC's UI |
| `scripts/list-streams.ts` | Lists all streams for a tenant slug, with IDs — use this to find a stream ID for `test-send.ts` |
| `scripts/list-isc-identities.ts` | Read-only: uses `company21912/.env.local` OAuth creds to list real ISC identities |
| `scripts/check-stream-auth.ts` | Decodes a stream's stored `authorizationHeader` JWT and reports its expiration — use this if signal sends start failing with 401 again |
| `scripts/check-api-scope.ts` | Read-only: decodes the `company21912` API client's token to show its granted `authorities`/scope |
| `package.json` | `build`: `next build` (deliberately does NOT run migrations); `migrate`: `prisma migrate deploy` (run manually against the Session pooler); `postinstall`: `prisma generate`; `provision-tenant` script alias |
| `.gitignore` | Excludes `.env*`, `/app/generated/prisma`, `/dev.db*`, AI-assistant reference folders (`.agents`, `.claude/skills`, `.windsurf/skills`) |
| `README.md` | Self-deploy instructions (Supabase + Vercel), Phase 0 gate checklist, "what this is NOT" section |
| `docs/How to Build the SSF Transmitter.md` | Copied in from the original architecture doc for onboarding context |
| `docs/sailpoint-support-case-verify-endpoint.md` | Drafted, evidence-backed support case for the unresolved `/ssf/verify` issue — **not yet submitted to SailPoint** |
| `docs/HANDOFF_RUNBOOK.md` | This document |

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
  resume their project first.
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
- **`NEXT_PUBLIC_APP_URL` is optional** — the app auto-detects Vercel's
  production URL via `VERCEL_PROJECT_PRODUCTION_URL` when deployed. It
  only needs to be set explicitly for local script runs (see Section 10)
  or a custom domain.
- **No portal/Simulator UI exists.** Every signal sent in this project so
  far was triggered by a developer running `scripts/test-send.ts` from a
  terminal — not something an SE could do today without engineering help.

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
3. **Only one vendor scenario (CrowdStrike-labeled `risk-level-change`) has
   been tested end-to-end.** The other 24 scenarios across 5 vendors (per
   the ARD's vendor scope) exist only as a concept, not as code or ISC
   config.
4. **Only one companion Workflow exists** (risk-level-change → disable
   PRISM). `session-revoked` and `credential-change` have SailPoint-native
   templates too (per the release notes pasted into this session) and are
   worth building/testing next, since they may prove more reliable/
   mature on SailPoint's side than `risk-level-change`.
5. **No Simulator UI.** All testing is via `scripts/test-send.ts`, run
   manually from a terminal by a developer. Not usable by an SE yet.
6. **The original "Threat Signal Transmitter" Receiver/Stream (the first
   one created, before "v2") still exists in ISC with a permanently
   expired authorization credential.** It was not deleted — only a second,
   working one ("Threat Signal Transmitter v2") was created alongside it.
   Decide whether to delete the stale one or leave it as a reference.
7. **`scripts/test-send.ts` is hardcoded**, not parameterized via CLI args
   for tenant/subject/event type. Fine for continued manual testing, but
   should become real Simulator UI inputs in Phase 2.
8. **No automated integration test harness exists.** `How to Build the SSF
   Transmitter.md` lists this explicitly under both Phase 1 ("Integration
   tests: discovery, stream create, verify SET, signed send") and the
   ordered backlog (item 8). What exists instead is a set of manual,
   developer-run diagnostic scripts (`scripts/check-*.ts`,
   `list-streams.ts`) — useful, but not automated tests that run in CI or
   catch a regression before it reaches production.
9. **The companion Workflow is not packaged as an importable artifact.**
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
10. **Source-doc backlog items not started at all:** "Preview = wire
    payload" (no UI to preview anything in), "Identity picker" (no UI),
    "Scheduler/demo queue" (no UI). All correctly deferred to Phase 2/the
    Simulator UI — listed here only so they're not silently forgotten.

---

## 8. Risks or Warnings

- **Jayme Cannon's PRISM account may currently be in a DISABLED state** as
  of the end of this session (it was successfully disabled by the last
  test run, and was not confirmed re-enabled afterward in this
  conversation). **Check and manually re-enable it before any further
  testing or a real demo**, via her Accounts tab → PRISM row → "..." →
  Enable Account.
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
- **Signing keys are currently stored as plaintext PEM in the Postgres
  database** (`SigningKey.privateKeyPem`), per the schema comment
  explicitly flagging this needs to move to a real managed vault (e.g.
  Supabase Vault) before this is anything more than a proof-of-concept /
  small-scale demo tool.

---

## 9. Exact Next Steps

Immediate housekeeping first, then **explicitly mapped to `How to Build the
SSF Transmitter.md`'s own "Suggested backlog (ordered)"**, since that
document's priority order should govern what "next" means here rather than
this session's improvised order.

### 9.0 Immediate housekeeping (do first, takes minutes)

1. **Re-enable Jayme Cannon's PRISM account** in ISC if it's still
   disabled (Accounts tab → "..." → Enable Account).
2. **Decide the fate of the original (v1) Receiver/Stream** in ISC — delete
   it, or leave it as a known-broken reference. It currently has an
   expired credential and cannot send signals.

### 9.1 Source doc's ordered backlog — status and next action on each

| # | Backlog item (source doc's order) | Status | Next action |
|---|---|---|---|
| 1 | Verify gate — end-to-end ISC Receiver Verify Connection + one successful SET | **Blocked** | Submit the drafted support case (`docs/sailpoint-support-case-verify-endpoint.md`) to SailPoint Support/Developer Community. Stop guessing response shapes without new information. |
| 2 | Stream status gating — never push to paused/disabled streams | **Done** | `sendSsfSignal()` in `lib/ssf.ts` already throws `StreamNotActiveError` for non-enabled streams. No action needed. |
| 3 | Preview = wire payload — SE sees exactly what ISC receives | **Not started** | Blocked on the Simulator UI existing at all (Phase 2). |
| 4 | Identity picker — saved demo subjects (email / `iss_sub`) | **Not started** | Same — Phase 2 UI work. |
| 5 | Catalog expansion — PRD narratives mapped onto supported CAEP types | **Not started** | Only 1 of 25 target scenarios (ARD Section 6.1) has been built/tested. Directly blocks the "at least 3 CAEP types" definition-of-done criterion (Section 2.1) — recommend testing `session-revoked` and `credential-change` next specifically because SailPoint's own release notes call those two out as having the most mature native template support. |
| 6 | Companion Workflow pack — importable ISC Workflow JSON templates | **Partial** | One Workflow exists, but only live inside `company21912-poc`, not exported. **Action: use the download icon next to "Workflow Details" in ISC's Workflow builder to export the current Workflow as JSON, commit it to a new `workflow/` folder in the repo.** This is the single fastest way to make today's work reusable by another SE. |
| 7 | Scheduler / demo queue — countdown or multi-step script sends | **Not started** | Phase 2 UI work. |
| 8 | Integration test harness — discovery, streams, verify, signed delivery | **Not started** | The `scripts/check-*.ts` files are manual diagnostics, not automated tests. Recommend converting the working manual test flow (Section 10.3) into a real test suite (e.g. Vitest/Jest) that can run in CI and catch regressions — especially for the token-rotation bug class (Section 3.5, item 12), which would have been caught immediately by an automated re-run of the signal-send flow. |

### 9.2 Broader next steps beyond the backlog

9. **Write the full external onboarding guide** for other SEs — this
   runbook plus the README are internal/technical; a polished, SE-facing
   step-by-step (screenshots, no jargon) is still needed, matching what
   was promised earlier in this project. Once backlog item 6 (importable
   Workflow JSON) is done, that guide gets meaningfully shorter and more
   reliable — "import this file" beats "manually rebuild these 9 steps."
10. **Start Phase 2 in earnest**: design and build the actual Simulator UI
    (vendor dropdown, scenario picker, identity picker, Send Now button)
    so sending a signal stops requiring a developer running a script from
    a terminal. Backlog items 3, 4, and 7 above all live here.
11. **Expand the vendor/payload catalog** beyond the single tested
    CrowdStrike scenario, per the ARD's full 25-scenario scope (5 vendors ×
    5 scenarios each), all still mapped onto the 5 supported CAEP types.

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
8. Provision a tenant:
   ```
   npm run provision-tenant -- <your-tenant-slug> "<Human Readable Name>"
   ```
   This prints an **API Token** and a **Discovery URL** — save both.

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
```

If signal sends start failing with `401` / `"JWT is expired"`, run
`check-stream-auth.ts` on the stream in question first — if expired, the
fix is a fresh stream (Section 10.3 steps 6-8), not a code change (the
rotation bug that caused this was already fixed in this session).
