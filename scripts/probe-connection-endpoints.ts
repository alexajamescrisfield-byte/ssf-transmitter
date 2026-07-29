// Read-only probe: find the API resource behind sp:http v3's
// parameterPicker-based OAuth credential reference (SailPoint calls
// these "Connections" in Workflow Studio's HTTP action UI, storing
// secrets server-side so they never appear in the Workflow's exported
// JSON).
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

  const candidates = [
    "beta/workflows/connections",
    "beta/workflow-library/connections",
    "beta/connections",
    "beta/workflows/parameters",
    "beta/parameters",
    "beta/workflow-connections",
    "beta/action-connections",
    "beta/workflows/external-connections",
  ];
  for (const path of candidates) {
    const res = await fetch(`${apiBase}/${path}`, { headers: auth });
    console.log(`GET /${path} -> ${res.status}`);
    if (res.status !== 404) {
      console.log((await res.text()).slice(0, 500));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
