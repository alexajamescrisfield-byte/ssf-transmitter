// Fix: the initial create used the wrong attribute key ("filter" instead
// of "filter.$", the JSONPath-reference convention ISC's Workflow API
// requires -- confirmed by inspecting the working risk-level-change
// Workflow's trigger shape). Without it, the trigger has no filter at all
// and would fire on every device-compliance-change event, not just
// not-compliant ones.
import { readFileSync } from "fs";
import { join } from "path";

const WORKFLOW_ID = "a31a6d25-755b-4ac2-9835-763f0f3de6b3";

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

  const filterOp = [
    {
      op: "replace",
      path: "/trigger/attributes",
      value: {
        id: "idn:caep-device-compliance-change-events",
        "filter.$":
          '$.ssfEvent.events["https://schemas.openid.net/secevent/caep/event-type/device-compliance-change"][?(@.current_status == "not-compliant")]',
      },
    },
  ];

  console.log("Attempting trigger patch directly (workflow currently enabled)...");
  let result = await patchWorkflow(apiBase, auth, filterOp);
  console.log("status:", result.status);

  if (!result.ok && result.text.includes("enabled")) {
    console.log("\nBlocked because workflow is enabled -- disabling, patching, re-enabling...");
    const disable = await patchWorkflow(apiBase, auth, [
      { op: "replace", path: "/enabled", value: false },
    ]);
    console.log("disable status:", disable.status);

    result = await patchWorkflow(apiBase, auth, filterOp);
    console.log("patch status:", result.status);
    console.log(result.text);

    const enable = await patchWorkflow(apiBase, auth, [
      { op: "replace", path: "/enabled", value: true },
    ]);
    console.log("re-enable status:", enable.status);
  } else {
    console.log(result.text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
