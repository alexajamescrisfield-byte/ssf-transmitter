// Fixes the live credential-change Workflow: renames the "Get Identity's
// Manager" step key to "Get Identity 1" (matching the original working
// Workflow's convention) so its auto-generated JSONPath reference
// resolves to "getIdentity1", matching what the Send Email step
// references. The step KEY (not displayName) determines this reference --
// conflating them was the bug.
import { readFileSync } from "fs";
import { join } from "path";

const WORKFLOW_ID = "bd3f6b7d-85a7-47b4-be57-b87399f45196";

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
      op: "add",
      path: "/definition/steps/Get Identity 1",
      value: {
        actionId: "sp:get-identity",
        attributes: { "id.$": "$.getIdentity.managerRef.id" },
        description: "This action returns the name and other attributes about the identity's manager.",
        displayName: "Get Identity's Manager",
        nextStep: "Create Certification Campaign",
        type: "action",
        versionNumber: 2,
      },
    },
    {
      op: "remove",
      path: "/definition/steps/Get Identity's Manager",
    },
    {
      op: "replace",
      path: "/definition/steps/Manage Accounts/nextStep",
      value: "Get Identity 1",
    },
  ];

  const step = await patch(ops);
  console.log("fix step key:", step.status);
  console.log(step.text.slice(0, 300));

  const enable = await patch([{ op: "replace", path: "/enabled", value: true }]);
  console.log("enable:", enable.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
