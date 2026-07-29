# Support request: `Create Certification Campaign` Workflow action always builds an unconstrained wildcard-search campaign, not the configured identity-scoped one

## Summary

The native Workflow action **`sp:create-campaign`** (technical action id
`sp:create:campaign:v2`), when configured for a single-identity
`REVIEWER_IDENTITY` campaign ("Certify all access" for one target
identity, one Individual reviewer), consistently fails with:

```
campaign id: <id> has error status (type: Campaign creation failed, retryable: false)
```

and, when observed directly via the Certification Campaigns UI's own
validation message, the underlying cause is:

```
Certification campaign from Search exceeded 10000 access items.
Create a new campaign with fewer access items.
```

This happens even though the campaign is configured to certify exactly
one identity's access, and even after removing every optional/dangling
field from the Workflow step -- the actual HTTP request body the action
sends (captured directly, see below) shows the action **always** wraps a
single-identity `REVIEWER_IDENTITY` campaign inside a `searchCampaignInfo`
object with `"query": "*"`, i.e. an unconstrained, org-wide search query,
regardless of the Workflow's configured scope.

## Environment

- ISC tenant: `company21912-poc`
- Workflow: "SSF Injector Demo - Create a Certification Campaign When Token
  Claims Change" (id `089b0904-af1d-409d-bae9-2fe4e6dfa3b2`), built from
  SailPoint's own native template **"Create a Certification Campaign When
  Token Claims Change"**.
- Steps: `Get Identity` -> `Get Identity's Manager` -> **`Create
  Certification Campaign`** (fails here) -> `Send Email` -> End.
- Target identity: `Jayme.Cannon` (5 real Active-Directory-sourced
  entitlements).
- Reviewer: the identity's manager, `Martena.Heath`.

## What's confirmed working

- The Workflow's trigger (`CAEP Token Claims Change Events`) fires
  correctly on a real, spec-compliant signed SET.
- `Get Identity` and `Get Identity's Manager` both complete correctly with
  live data.
- The **exact same campaign** (same target identity, same Individual
  reviewer, same "Certify all access" scope) built **by hand, through
  ISC's own Certifications UI**, with identical settings, **succeeds with
  zero errors**. This isolates the problem specifically to how the
  Workflow's action constructs and submits the campaign-creation request
  -- not to the campaign type/configuration itself, and not to the target
  identity's data (her entitlement count is small: 5).

## What's failing, and the smoking-gun evidence

The Workflow step's configured attributes are:

```json
{
  "activateUponCreation": false,
  "duration": "30d",
  "emailNotificationEnabled": true,
  "name.$": "$.trigger.identityAttributes.name",
  "reviewerAccessItemType": "ENTITLEMENT",
  "reviewerAccessOperator": "ALL",
  "reviewerCertificationType": "ACCESS",
  "reviewerId.$": "$.getIdentity.managerRef.id",
  "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
  "type": "REVIEWER_IDENTITY",
  "undecidedAccess": false
}
```

(We also found and removed an unrelated dangling attribute,
`reviewerAccessConstraintIds.$`, that referenced a step that didn't exist
in this Workflow -- confirmed via testing that this made **no difference**
to the outcome, which is why we're reporting the deeper issue below rather
than that cleanup.)

Captured directly from `GET
/beta/workflow-executions/{executionId}/history` (the actual
`ActivityTaskScheduled` event for the `Create Certification Campaign`
step), this is the **real HTTP request body** the action builds and sends
to the campaign-creation API, regardless of the above configuration:

```json
{
  "activateUponCreation": false,
  "body": {
    "autoRevokeAllowed": false,
    "campaignSizeType": "FULL",
    "duration": "30d",
    "emailNotificationEnabled": true,
    "name": "Jayme.Cannon",
    "recommendationsEnabled": null,
    "searchCampaignInfo": {
      "accessConstraints": {
        "ids": "",
        "operator": "ALL",
        "type": "ENTITLEMENT"
      },
      "identityIds": "00236705f36b407199b11592af378ef3",
      "query": "*",
      "reviewer": {
        "id": "9542022ccccd472d8ad8b732fde83cb3",
        "type": "REVIEWER_IDENTITY"
      },
      "type": "ACCESS"
    },
    "sourceOwnerCampaignInfo": { "sourceIds": null },
    "type": "REVIEWER_IDENTITY"
  }
}
```

Note:
- `searchCampaignInfo.query` is the literal string `"*"` -- an
  unconstrained, tenant-wide search -- even though `identityIds` is
  correctly populated with the single target identity's ID.
- `searchCampaignInfo.accessConstraints.ids` is an empty string, never
  populated with anything, regardless of whether the Workflow step has an
  access-constraint field wired up or not.
- The action appears to unconditionally route every `REVIEWER_IDENTITY`
  campaign request through a **Search**-based campaign-creation code path
  (`query: "*"`), rather than a genuinely identity-scoped one, no matter
  what `reviewerAccessOperator` ("Certify all access" vs "Certify specific
  access") is configured to in the Workflow builder UI.
- The subsequent error confirms the search query is being executed
  literally: the campaign creation fails once the wildcard search
  (`query: "*"`) matches more than 10,000 access items tenant-wide --
  which will happen in any reasonably sized tenant, regardless of how
  small the *target identity's own* access is (5 entitlements, in this
  case).

Two separate, reproducible campaign creations (different campaign IDs)
failed identically. Not transient.

## Question

**Is `sp:create-campaign` (`sp:create:campaign:v2`) expected to route
`REVIEWER_IDENTITY`-type campaigns through an unconstrained
`searchCampaignInfo.query: "*"` request, or is this a bug where the
action should instead be constraining the search to the identity(ies)
listed in `identityIds`?** The API request shown above has all the
correct identity/reviewer scoping information present
(`identityIds`, `reviewer`) but the `query` field ignores it entirely.

If this is a bug: is there a known workaround via the Workflow builder UI
(e.g. a different field combination) that produces a properly scoped
request, or does this action need a platform-side fix before it can be
used reliably for any tenant with more than 10,000 total access items?

## Trace / reference IDs

- Workflow id: `089b0904-af1d-409d-bae9-2fe4e6dfa3b2`
- Execution id (latest failing run, with full captured request body):
  `966bb480d26f44dcae476fcfea3b1d7d`
- Failed campaign ids: two distinct IDs across two separate attempts
  (values available on request; omitted here as internal identifiers that
  change per attempt and add no diagnostic value beyond what's shown
  above).
