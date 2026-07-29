// Finalizes the working fix: static campaign name "Emergency Access
// Review" (per the user's request) instead of the identity's display
// name, and activateUponCreation:true so the campaign goes live
// automatically instead of staying STAGED after a real signal.
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

  const ops = [
    {
      op: "replace",
      path: "/definition/steps/Create Certification Campaign/attributes",
      value: {
        activateUponCreation: true,
        description: "Emergency access review triggered by a token-claims-change signal via the SSF Threat Signal Transmitter.",
        duration: "30d",
        emailNotificationEnabled: true,
        name: "Emergency Access Review",
        reviewerCertificationType: "IDENTITY",
        "reviewerId.$": "$.getIdentity.managerRef.id",
        "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
        type: "REVIEWER_IDENTITY",
      },
    },
    {
      op: "replace",
      path: "/definition/steps/Send Email/attributes/context/var4.$",
      value: "$.createCertificationCampaign.name",
    },
  ];

  const step = await patch(ops);
  console.log("patch:", step.status);
  console.log(step.text.slice(0, 500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
