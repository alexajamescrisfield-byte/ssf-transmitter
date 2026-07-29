// Read-only: list certification campaigns in the tenant so a real,
// working campaign's JSON shape can be used as a template for creating
// a new one via direct API call (bypassing the buggy sp:create-campaign
// Workflow action).
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

  for (const path of ["v3/certifications/campaigns", "beta/certifications/campaigns", "v3/campaigns", "beta/campaigns"]) {
    const res = await fetch(`${apiBase}/${path}?limit=50`, { headers: auth });
    console.log(`GET /${path} -> ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items ?? [];
      console.log(`  ${list.length} campaigns`);
      for (const c of list) {
        console.log(`  - ${c.id}  "${c.name}"  type=${c.type}  status=${c.status}  created=${c.created}`);
      }
    } else {
      console.log("  ", await res.text());
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
