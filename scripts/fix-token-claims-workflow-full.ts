// Real fix: replace the broken "Create Certification Campaign" step
// (sp:create-campaign, confirmed to always send searchCampaignInfo.type
// "ACCESS" + query:"*" -- an org-wide access-item search that exceeds
// ISC's 10,000-item guard, regardless of Workflow configuration) with:
//
//   1. An sp:http step that calls POST /v3/campaigns directly, using
//      searchCampaignInfo.type:"IDENTITY" + identityIds scoped to the
//      triggering identity -- confirmed correct via manual testing
//      (matches the working "Jayme.Cannon Manual Test" campaign's shape:
//      1 identity, 3 decisions, not 10,000+).
//   2. sp:activate-campaign (a native action taking a plain "id" field --
//      no URL-path templating needed, unlike a raw HTTP activate call)
//      to activate the campaign created in step 1.
//
// Also fixes the Send Email step's context, which referenced
// "$.createCertificationCampaign.name" (the native action's output
// shape) -- now needs "$.createCertificationCampaign.body.name" since
// sp:http's output is {body, headers, statusCode}.
import { readFileSync } from "fs";
import { join } from "path";

const WORKFLOW_ID = "089b0904-af1d-409d-bae9-2fe4e6dfa3b2";

function loadEnvLocal() {
  const path = join("C:\\Users\\delga\\OneDrive\\Documents\\company21912", ".env.local");
  const text = readFileSync(path, "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const apiBase = env.TENANT_API_NAME.replace(/\/$/, "");
  const tokenRes = await fetch(`${apiBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
    }),
  });
  const { access_token } = await tokenRes.json();
  const auth = { Authorization: `Bearer ${access_token}` };

  async function patch(ops: unknown[]) {
    const res = await fetch(`${apiBase}/beta/workflows/${WORKFLOW_ID}`, {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json-patch+json" },
      body: JSON.stringify(ops),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  }

  // Ensure disabled first (required for structural PATCH edits).
  const disable = await patch([{ op: "replace", path: "/enabled", value: false }]);
  console.log("disable:", disable.status);

  const ops = [
    {
      op: "replace",
      path: "/definition/steps/Create Certification Campaign",
      value: {
        actionId: "sp:http",
        description:
          "Creates a properly identity-scoped certification campaign directly via the ISC API. Bypasses sp:create-campaign, which always searches type:ACCESS query:\"*\" (org-wide) regardless of configuration, exceeding the 10,000-item guard.",
        attributes: {
          authenticationType: "OAuth",
          oAuthTokenUrl: `${apiBase}/oauth/token`,
          oAuthClientId: env.CLIENT_ID,
          oAuthClientSecret: env.CLIENT_SECRET,
          oAuthCredentialLocation: "oAuthInHeader",
          url: `${apiBase}/v3/campaigns`,
          method: "post",
          requestContentType: "json",
          jsonRequestBody: {
            name: "Emergency Access Review",
            description:
              "Emergency access review triggered by a token-claims-change signal via the SSF Threat Signal Transmitter.",
            type: "SEARCH",
            emailNotificationEnabled: true,
            autoRevokeAllowed: false,
            searchCampaignInfo: {
              type: "IDENTITY",
              "identityIds.$": "$.trigger.identityAttributes.id",
              reviewer: { type: "MANAGER" },
            },
          },
        },
        nextStep: "Activate Certification Campaign",
        type: "action",
        versionNumber: 2,
      },
    },
    {
      op: "add",
      path: "/definition/steps/Activate Certification Campaign",
      value: {
        actionId: "sp:activate-campaign",
        description: "Activates the campaign created in the previous step -- sends the real reviewer notification.",
        attributes: {
          "id.$": "$.createCertificationCampaign.body.id",
        },
        nextStep: "Send Email",
        type: "action",
        versionNumber: 1,
      },
    },
  ];

  const step1 = await patch(ops);
  console.log("replace+add step:", step1.status);
  console.log(step1.text);

  const fixEmailContext = [
    {
      op: "replace",
      path: "/definition/steps/Send Email/attributes/context",
      value: {
        "var1.$": "$.getIdentity1.attributes.firstname",
        "var2.$": "$.getIdentity.attributes.displayName",
        "var4.$": "$.createCertificationCampaign.body.name",
      },
    },
  ];
  const step2 = await patch(fixEmailContext);
  console.log("fix email context:", step2.status);
  console.log(step2.text);

  const enable = await patch([{ op: "replace", path: "/enabled", value: true }]);
  console.log("enable:", enable.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
