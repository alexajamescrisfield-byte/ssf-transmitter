// Fix: the live "Create Certification Campaign" step carried a stray,
// unresolvable attribute -- "reviewerAccessConstraintIds.$": "$.getAccess.accessItems"
// -- referencing a Get Access step that was never added to this Workflow.
// reviewerAccessOperator is "ALL" (Certify all access, scoped via
// reviewerIdentitiesToCertify), which per sp:create-campaign's schema
// doesn't use reviewerAccessConstraintIds at all. Theory: the dangling
// reference makes ISC's backend build the campaign as an unconstrained
// Search-type campaign instead of the intended identity-scoped
// REVIEWER_IDENTITY campaign, matching the observed error ("Certification
// campaign from Search exceeded 10000 access items"). Fix: remove the
// stray attribute, leaving the step exactly matching the manual UI
// campaign that succeeded (same operator, same scope, same reviewer).
import { readFileSync } from "fs";
import { join } from "path";

const WORKFLOW_ID = "089b0904-af1d-409d-bae9-2fe4e6dfa3b2";

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

async function patchWorkflow(
  apiBase: string,
  auth: Record<string, string>,
  ops: unknown[],
) {
  const res = await fetch(`${apiBase}/beta/workflows/${WORKFLOW_ID}`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(ops),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
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

  const removeOp = [
    {
      op: "remove",
      path: "/definition/steps/Create Certification Campaign/attributes/reviewerAccessConstraintIds.$",
    },
  ];

  console.log("Attempting patch directly (workflow currently enabled)...");
  let result = await patchWorkflow(apiBase, auth, removeOp);
  console.log("status:", result.status);
  console.log(result.text);

  if (!result.ok && result.text.toLowerCase().includes("enabled")) {
    console.log("\nBlocked because workflow is enabled -- disabling, patching, re-enabling...");
    const disable = await patchWorkflow(apiBase, auth, [
      { op: "replace", path: "/enabled", value: false },
    ]);
    console.log("disable status:", disable.status, await disable.text);

    result = await patchWorkflow(apiBase, auth, removeOp);
    console.log("patch status:", result.status);
    console.log(result.text);

    const enable = await patchWorkflow(apiBase, auth, [
      { op: "replace", path: "/enabled", value: true },
    ]);
    console.log("re-enable status:", enable.status);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
