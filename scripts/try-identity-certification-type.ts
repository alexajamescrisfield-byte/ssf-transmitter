// Tries switching the native sp:create-campaign action from
// reviewerCertificationType:"ACCESS" (confirmed buggy -- always
// searchCampaignInfo.type:"ACCESS" query:"*", org-wide) to
// reviewerCertificationType:"IDENTITY" (a distinct branch in the
// action's own schema). If the native action correctly maps this to
// searchCampaignInfo.type:"IDENTITY" (matching our proven-working manual
// pattern), this fixes the bug with ZERO external HTTP calls, ZERO
// embedded secrets, and no URL-templating problem -- since it stays a
// native action using the platform's own internal auth, same as
// Get Identity.
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

  const disable = await patch([{ op: "replace", path: "/enabled", value: false }]);
  console.log("disable:", disable.status);

  const ops = [
    {
      op: "replace",
      path: "/definition/steps/Create Certification Campaign/attributes",
      value: {
        activateUponCreation: false,
        description:
          "This action creates a certification campaign assigned to the identity's manager to verify all of the identity's access. The name of the campaign will be the display name of the identity.",
        duration: "30d",
        emailNotificationEnabled: true,
        "name.$": "$.trigger.identityAttributes.name",
        reviewerCertificationType: "IDENTITY",
        "reviewerId.$": "$.getIdentity.managerRef.id",
        "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
        type: "REVIEWER_IDENTITY",
      },
    },
  ];

  const step = await patch(ops);
  console.log("patch attributes:", step.status);
  console.log(step.text);

  const enable = await patch([{ op: "replace", path: "/enabled", value: true }]);
  console.log("enable:", enable.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
