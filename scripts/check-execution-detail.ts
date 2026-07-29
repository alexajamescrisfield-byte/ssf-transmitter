// Read-only: try several endpoint shapes to find execution step-level
// detail/history for a failed workflow execution.
import { readFileSync } from "fs";
import { join } from "path";

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
  const [workflowId, executionId] = process.argv.slice(2);
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

  const paths = [
    `/beta/workflows/${workflowId}/executions/${executionId}/history`,
    `/beta/workflows/executions/${executionId}/history`,
    `/beta/workflow-executions/${executionId}/history`,
    `/beta/workflow-executions/${executionId}`,
    `/beta/workflows/${workflowId}/executions/${executionId}`,
  ];

  for (const path of paths) {
    const res = await fetch(`${apiBase}${path}`, { headers: auth });
    console.log(`GET ${path} ->`, res.status);
    if (res.ok) {
      console.log(JSON.stringify(await res.json(), null, 2));
      return;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
