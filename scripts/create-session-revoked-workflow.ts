// Creates the "session-revoked" companion Workflow: disables PRISM +
// Active Directory accounts, then creates a certification campaign.
// Same proven pattern as the credential-change Workflow. session-revoked
// has no required CAEP claims (CAEP_REQUIRED_CLAIMS["session-revoked"] is
// empty), so there's nothing meaningful to filter the trigger on -- it
// fires on every session-revoked event, same as the original
// risk-level-change Workflow's base trigger (no filter).
import { readFileSync } from "fs";
import { join } from "path";

const PRISM_SOURCE_ID = "8c63bd999dd74afcb4e344ba0466ae9b";
const AD_SOURCE_ID = "ca713180aecb4ad3b424446335af000d";

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
  const auth = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

  const body = {
    name: "SSF Injector Demo - Remove Access + Certify When Session Revoked",
    description:
      "Triggered by a CAEP Session Revoked event. Disables PRISM + Active Directory accounts, then creates a certification campaign for the identity's manager.",
    trigger: {
      type: "EVENT",
      attributes: {
        id: "idn:caep-session-revoked-events",
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
            "accountIds.$": `$.getAccounts.accounts[?(@.sourceId=="${PRISM_SOURCE_ID}" || @.sourceId=="${AD_SOURCE_ID}")].id`,
            operation: "disable",
          },
          description: "This action disables the identity's PRISM and Active Directory accounts.",
          displayName: "Disable Accounts",
          nextStep: "Get Identity 1",
          type: "action",
          versionNumber: 1,
        },
        "Get Identity 1": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.getIdentity.managerRef.id" },
          description: "This action returns the name and other attributes about the identity's manager.",
          displayName: "Get Identity's Manager",
          nextStep: "Create Certification Campaign",
          type: "action",
          versionNumber: 2,
        },
        "Create Certification Campaign": {
          actionId: "sp:create-campaign",
          attributes: {
            activateUponCreation: true,
            description: "Session revoked access review, triggered by the SSF Threat Signal Transmitter.",
            duration: "30d",
            emailNotificationEnabled: true,
            name: "Session Revoked Access Review",
            reviewerCertificationType: "IDENTITY",
            "reviewerId.$": "$.getIdentity.managerRef.id",
            "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
            type: "REVIEWER_IDENTITY",
          },
          description: "Creates a certification campaign assigned to the identity's manager.",
          displayName: "Create Certification Campaign",
          nextStep: "Send Email",
          type: "action",
          versionNumber: 2,
        },
        "Send Email": {
          actionId: "sp:send-email",
          attributes: {
            body: "<p>Hello ${var1},</p><p>This email is to inform that a suspicious session revocation was detected for your direct report, ${var2}. PRISM and Active Directory accounts have been disabled, and a certification campaign named ${var4} has been created. Please review within 30 days.</p><p>Thank you,<br>Corporate Compliance Officer</p>",
            carbonCopy: ["alexa.delgado@sailpoint.com"],
            context: {
              "var1.$": "$.getIdentity1.attributes.firstname",
              "var2.$": "$.getIdentity.attributes.displayName",
              "var4.$": "$.createCertificationCampaign.name",
            },
            "recipientEmailList.$": "$.getIdentity1.attributes.email",
            subject: "Session Revoked",
          },
          description: "Notifies the identity's manager.",
          displayName: "Send Email",
          nextStep: "success 1",
          type: "action",
          versionNumber: 2,
        },
        "success 1": {
          actionId: "sp:operator-success",
          description: "Accounts disabled, campaign created, manager notified. Success.",
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
