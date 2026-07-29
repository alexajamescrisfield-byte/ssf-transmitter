// Read-only probe: does ISC expose a body-based bulk activate endpoint
// for campaigns (avoiding the need for URL path interpolation, which the
// Workflow HTTP action's JSONPath-only substitution can't do cleanly)?
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

  // Probe with an OPTIONS-style empty body just to see if the route exists
  // (expect 400 for bad body if the route exists, 404 if it doesn't).
  for (const path of ["v3/campaigns/activate", "beta/campaigns/activate"]) {
    const res = await fetch(`${apiBase}/${path}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    console.log(`POST /${path} (empty body) -> ${res.status}`);
    console.log((await res.text()).slice(0, 400));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
