// Read-only diagnostic: check the most recent execution of a workflow to
// confirm the branching edit fired correctly end-to-end.
// Usage: npx tsx scripts/check-workflow-execution.ts [workflowId]
import { readFileSync } from "fs";
import { join } from "path";

const DEFAULT_WORKFLOW_ID = "d7ee6b95-7109-44fd-bfdc-240032ad5c29";

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
  const workflowId = process.argv[2] ?? DEFAULT_WORKFLOW_ID;
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

  const res = await fetch(
    `${apiBase}/beta/workflows/${workflowId}/executions?limit=1`,
    { headers: auth },
  );
  const executions = await res.json();
  console.log("Latest execution:", JSON.stringify(executions[0], null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
