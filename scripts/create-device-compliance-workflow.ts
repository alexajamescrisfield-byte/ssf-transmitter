// Creates the "device-compliance-change" companion Workflow via the ISC
// Workflows API, mirroring the proven shape of the existing
// risk-level-change Workflow (Get Identity -> Get Accounts -> Disable
// Accounts, scoped to PRISM only from the start -- see HANDOFF_RUNBOOK.md
// Section 5's PRISM-only decision).
import { readFileSync } from "fs";
import { join } from "path";

const PRISM_SOURCE_ID = "8c63bd999dd74afcb4e344ba0466ae9b";

function loadEnvLocal() {
  const path = join(
    "C:\\Users\\delga\\OneDrive\\Documents\\company21912",
    ".env.local",
  );
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
  const auth = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

  const body = {
    name: "SSF Injector Demo - Remove Access on Device Non-Compliance",
    description:
      "Triggered by a CAEP Device Compliance Change event showing an identity's device as not-compliant. Disables the identity's PRISM account only (see risk-level-change Workflow for blast-radius rationale).",
    trigger: {
      type: "EVENT",
      attributes: {
        id: "idn:caep-device-compliance-change-events",
        filter:
          '$.ssfEvent.events["https://schemas.openid.net/secevent/caep/event-type/device-compliance-change"][?(@.current_status == "not-compliant")]',
      },
    },
    definition: {
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
          nextStep: "Manage Accounts",
          type: "action",
          versionNumber: 1,
        },
        "Manage Accounts": {
          actionId: "sp:manage-account",
          attributes: {
            "accountIds.$": `$.getAccounts.accounts[?(@.sourceId=="${PRISM_SOURCE_ID}")].id`,
            operation: "disable",
          },
          description: "This action disables the identity's PRISM account.",
          displayName: "Disable Accounts",
          nextStep: "success 1",
          type: "action",
          versionNumber: 1,
        },
        "success 1": {
          actionId: "sp:operator-success",
          description: "PRISM account disabled. The workflow finishes in a Success state.",
          displayName: "End Step - Success",
          type: "success",
        },
      },
    },
  };

  const res = await fetch(`${apiBase}/beta/workflows`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("POST /beta/workflows status:", res.status);
  console.log(text);

  if (!res.ok) process.exit(1);
  const created = JSON.parse(text);

  if (!created.enabled) {
    console.log("\nWorkflow created disabled (expected) -- enabling it now...");
    const enableRes = await fetch(`${apiBase}/beta/workflows/${created.id}`, {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json-patch+json" },
      body: JSON.stringify([{ op: "replace", path: "/enabled", value: true }]),
    });
    console.log("Enable status:", enableRes.status);
    console.log(await enableRes.text());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
