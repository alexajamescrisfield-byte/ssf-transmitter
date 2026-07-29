// Read-only probe: find ISC's SSF/Shared-Signals receiver event log via
// API, to check the actual correlation status of a specific signal (by
// jti) -- distinct from whether a Workflow fired, which is what
// check-workflow-execution.ts checks. A teammate reported a case where
// correlation succeeded but the Workflow still didn't fire, which our
// prior test (checking only Workflow executions) can't distinguish from
// "didn't correlate at all."
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
    "beta/shared-signals/events",
    "beta/shared-signals-events",
    "beta/ssf/events",
    "beta/sse-feed",
    "beta/sources", // list receivers to find the SSF receiver's own id first
  ];
  for (const path of candidates) {
    const res = await fetch(`${apiBase}/${path}?limit=10`, { headers: auth });
    console.log(`GET /${path} -> ${res.status}`);
    if (res.status !== 404) console.log((await res.text()).slice(0, 800));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
