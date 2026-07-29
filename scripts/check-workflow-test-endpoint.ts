// Read-only probe: does ISC expose a way to test-execute a Workflow
// on-demand (not just via its real trigger), so URL-templating syntax
// (e.g. States.Format) can be verified safely before touching the live
// token-claims-change Workflow?
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

  const workflowId = "089b0904-af1d-409d-bae9-2fe4e6dfa3b2"; // existing token-claims-change workflow, just probing routes
  for (const path of [
    `beta/workflows/${workflowId}/test`,
    `beta/workflows/execute/external/${workflowId}`,
  ]) {
    const res = await fetch(`${apiBase}/${path}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ input: {} }),
    });
    console.log(`POST /${path} -> ${res.status}`);
    console.log((await res.text()).slice(0, 400));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
