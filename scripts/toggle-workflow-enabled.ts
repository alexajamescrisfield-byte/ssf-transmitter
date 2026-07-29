// Usage: npx tsx scripts/toggle-workflow-enabled.ts <workflowId> <true|false>
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
  const workflowId = process.argv[2];
  const enabled = process.argv[3] === "true";
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

  const res = await fetch(`${apiBase}/beta/workflows/${workflowId}`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify([{ op: "replace", path: "/enabled", value: enabled }]),
  });
  console.log(`status: ${res.status}`);
  console.log((await res.text()).slice(0, 300));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
