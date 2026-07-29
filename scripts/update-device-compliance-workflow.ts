// Two changes to the device-compliance-change Workflow, requested together:
// 1. Disable action now covers PRISM + Active Directory (was PRISM-only).
// 2. New branch: the reverse-direction event (current_status == "compliant")
//    now re-enables those same accounts instead of being silently ignored --
//    a real, visible ISC state change, mirroring what "not-compliant" does.
//    This works because current_status/previous_status are OFFICIAL,
//    required CAEP claims for this event type (lib/caep.ts
//    CAEP_REQUIRED_CLAIMS), unlike the custom vendor/recommended_action
//    fields that ISC strips before a Workflow ever sees them (Section 7
//    item 5) -- branching on this field is a legitimate, different case.
import { readFileSync } from "fs";
import { join } from "path";

const WORKFLOW_ID = "a31a6d25-755b-4ac2-9835-763f0f3de6b3";
const PRISM_ID = "8c63bd999dd74afcb4e344ba0466ae9b";
const AD_ID = "ca713180aecb4ad3b424446335af000d";
const ACCOUNT_FILTER = `$.getAccounts.accounts[?(@.sourceId=="${PRISM_ID}" || @.sourceId=="${AD_ID}")].id`;

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

async function patchWorkflow(apiBase: string, auth: Record<string, string>, ops: unknown[]) {
  const res = await fetch(`${apiBase}/beta/workflows/${WORKFLOW_ID}`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(ops),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
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

  console.log("disabling workflow...");
  console.log((await patchWorkflow(apiBase, auth, [{ op: "replace", path: "/enabled", value: false }])).status);

  const newTrigger = [
    {
      op: "replace",
      path: "/trigger/attributes",
      value: {
        id: "idn:caep-device-compliance-change-events",
        "filter.$":
          '$.ssfEvent.events["https://schemas.openid.net/secevent/caep/event-type/device-compliance-change"][?(@.current_status == "not-compliant" || @.current_status == "compliant")]',
      },
    },
  ];
  console.log("widening trigger filter...");
  const triggerResult = await patchWorkflow(apiBase, auth, newTrigger);
  console.log(triggerResult.status, triggerResult.text.slice(0, 300));

  const newDefinition = [
    {
      op: "replace",
      path: "/definition",
      value: {
        start: "Get Identity",
        steps: {
          "Get Identity": {
            actionId: "sp:get-identity",
            attributes: { "id.$": "$.trigger.identityAttributes.id" },
            description: "This action returns attributes associated with the identity.",
            displayName: "Get Identity",
            nextStep: "Get Accounts",
            type: "action",
            versionNumber: 2,
          },
          "Get Accounts": {
            actionId: "sp:get-accounts",
            attributes: {
              getAccountsBy: "specificIdentity",
              "identity.$": "$.trigger.identityAttributes.id",
            },
            description: "This action returns the identity's current list of accounts.",
            displayName: "Get Identity's Accounts",
            nextStep: "Check Compliance Status",
            type: "action",
            versionNumber: 1,
          },
          "Check Compliance Status": {
            type: "choice",
            displayName: "Check Compliance Status",
            description:
              "Branches on the official current_status CAEP claim -- not-compliant disables PRISM+AD, compliant re-enables them.",
            choiceList: [
              {
                comparator: "StringEquals",
                nextStep: "Disable Accounts",
                "variableA.$":
                  '$.trigger.ssfEvent.events["https://schemas.openid.net/secevent/caep/event-type/device-compliance-change"].current_status',
                variableB: "not-compliant",
              },
            ],
            defaultStep: "Enable Accounts",
          },
          "Disable Accounts": {
            actionId: "sp:manage-account",
            attributes: { "accountIds.$": ACCOUNT_FILTER, operation: "disable" },
            description: "Disables the identity's PRISM and Active Directory accounts.",
            displayName: "Disable Accounts",
            nextStep: "success 1",
            type: "action",
            versionNumber: 1,
          },
          "Enable Accounts": {
            actionId: "sp:manage-account",
            attributes: { "accountIds.$": ACCOUNT_FILTER, operation: "enable" },
            description: "Re-enables the identity's PRISM and Active Directory accounts.",
            displayName: "Enable Accounts",
            nextStep: "success 1",
            type: "action",
            versionNumber: 1,
          },
          "success 1": {
            actionId: "sp:operator-success",
            description: "Workflow finishes in a Success state.",
            displayName: "End Step - Success",
            type: "success",
          },
        },
      },
    },
  ];
  console.log("updating definition (PRISM+AD scope, choice branch)...");
  const defResult = await patchWorkflow(apiBase, auth, newDefinition);
  console.log(defResult.status, defResult.text.slice(0, 500));

  console.log("re-enabling workflow...");
  console.log((await patchWorkflow(apiBase, auth, [{ op: "replace", path: "/enabled", value: true }])).status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
