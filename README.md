# Threat Signal Transmitter (TST)

A hosted SSF (Shared Signals Framework) **transmitter** for SailPoint Identity
Security Cloud (ISC). Solutions Engineers use it to simulate vendor security
alerts (CrowdStrike, Microsoft, Okta, Proofpoint, Zscaler) and push them into
an ISC tenant's Shared Signals Receiver as signed CAEP Security Event Tokens
(SETs), so an ISC Workflow fires a live, automated Zero Trust remediation
during a demo.

**Important:** SailPoint ISC is the *receiver*. It connects **out** to this
app to discover it, register a stream, and verify the connection. This app
never pushes into an ISC "webhook" — see
[`docs/How to Build the SSF Transmitter.md`](docs/How%20to%20Build%20the%20SSF%20Transmitter.md)
for the full architecture rationale.

## Who should deploy this

**Each SE deploys their own copy**, under their own free Vercel + Supabase
accounts. There is no shared central instance one person is responsible for
keeping up. Your deployment only affects your own demos.

## Deploy your own instance (~10 minutes)

### 1. Get a free Postgres database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Project Settings → Database → Connection string → URI tab.
3. Copy the **Transaction pooler** string (port `6543`) — this is what the
   app uses at runtime. You'll paste it into Vercel in step 3.
4. **Disable** "Automatically expose new tables" if Supabase asks — this app
   talks to Postgres directly via Prisma, not through Supabase's Data API,
   and some tables here (signing keys, API tokens) must never be exposed
   through a public REST/GraphQL layer.

### 2. Deploy to Vercel

1. Push/fork this repo to your own GitHub account (if you're reading this
   from a clone, you already have it).
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. When prompted for environment variables, set:
   - `DATABASE_URL` — the Supabase Transaction pooler string from step 1.
   - `NEXT_PUBLIC_APP_URL` — leave unset. Vercel provides its own production
     URL automatically and the app detects it (`VERCEL_PROJECT_PRODUCTION_URL`).
     Only set this manually if you're using a custom domain.
4. Deploy. The build runs `prisma migrate deploy` automatically, so your
   Supabase database gets the schema applied on first deploy.

### 3. Run the migration once, manually, if you didn't deploy via Vercel yet

If you want to test locally before deploying, or the automatic migration on
first deploy doesn't run for some reason:

```bash
# .env: set DATABASE_URL to Supabase's SESSION pooler (port 5432) --
# migrations need a persistent connection the Transaction pooler doesn't
# support. Switch back to the Transaction pooler (6543) afterward for
# normal app use.
npx prisma migrate deploy
```

### 4. Provision your first tenant

One tenant = one connection to one specific ISC org, with its own signing
key and API token. Name the slug after the real ISC tenant you're
connecting it to.

```bash
npm run provision-tenant -- your-tenant-slug "Human-Readable Name"
```

This prints an **API token** and a **Discovery URL**. Keep both — you'll
paste them into ISC next.

## Phase 0 — prove the protocol (do this before anything else)

This is the non-negotiable gate from the architecture doc. Do not build any
UI, catalog, or scheduler features until this passes end to end:

1. Deploy the transmitter publicly (done, if you followed the steps above).
2. In your ISC tenant admin console: **Admin → Connection → Shared Signals →
   Create New**. Paste in:
   - **Discovery URL**: `https://<your-vercel-url>/t/<your-slug>/.well-known/ssf-configuration`
   - **Authentication**: API Token → the token `provision-tenant` printed.
   - Select the CAEP event types you want this Receiver to accept.
3. Click **Verify Connection** and confirm it passes.
4. Send one `risk-level-change` SET for a real identity in that ISC tenant
   (via the provisioning/test scripts for now — a Simulator UI comes in
   Phase 2).
5. Confirm the event lands in ISC and fires a native CAEP Workflow trigger.

**If any of these fail, stop and fix it before building anything else.**

## What this app is NOT

- Not a Python desktop `.exe`/`.app` — SailPoint ISC cannot discover or
  verify a laptop-only process; see `How to Build the SSF Transmitter.md`.
- Not a webhook receiver — there is no inbound "push into us" endpoint from
  ISC's side; ISC only gives us a delivery URL after it creates a stream
  against our discovery/management endpoints, and we push only to that URL.
- Not inventing new SSF/CAEP event types. Only these five exist for us:
  `risk-level-change`, `credential-change`, `device-compliance-change`,
  `session-revoked`, `token-claims-change`. See `lib/caep.ts`.

## Project layout

```
app/t/[slug]/.well-known/ssf-configuration/route.ts   discovery document
app/t/[slug]/.well-known/jwks.json/route.ts            public signing key
app/t/[slug]/ssf/streams/route.ts                      stream create/list
app/t/[slug]/ssf/status/route.ts                        pause/enable a stream
app/t/[slug]/ssf/verify/route.ts                        connection verification
lib/ssf.ts            sendSsfSignal(), sendVerificationSet(), discovery doc builder
lib/caep.ts            the 5 CAEP event types + required-claims validator
lib/keys.ts             RS256 signing key generation per tenant
lib/auth.ts             bearer-token auth against a tenant's API token
prisma/schema.prisma    Tenant, SigningKey, Stream, AuditLog models
scripts/provision-tenant.ts   CLI to create a tenant (no UI yet -- Phase 0/1 only need this)
```

No SE portal UI yet -- that's Phase 2, built only after the Phase 0 gate
above passes for real. See `How to Build the SSF Transmitter.md` for the
full phased build plan.

## Local development

```bash
npm install
# set DATABASE_URL in .env to your own Postgres (Supabase or local)
npx prisma migrate deploy
npm run dev
```
