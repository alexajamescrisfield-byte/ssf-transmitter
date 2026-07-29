// Read-only: list campaign filters -- the manual "Jayme.Cannon Manual Test"
// campaign (SEARCH type) correctly scoped to just 3 decisions/1 identity,
// unlike the Workflow's query:"*". Looking for how that scope was encoded.
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

  for (const path of ["v3/campaign-filters", "beta/campaign-filters"]) {
    const res = await fetch(`${apiBase}/${path}`, { headers: auth });
    console.log(`GET /${path} -> ${res.status}`);
    console.log(JSON.stringify(await res.json(), null, 2).slice(0, 3000));
  }

  const certId = "7dcfb13072e2494f85df5dc73ca9282d";
  for (const path of [`v3/certifications/${certId}`, `v3/certifications/${certId}/decisions`]) {
    const res = await fetch(`${apiBase}/${path}`, { headers: auth });
    console.log(`\nGET /${path} -> ${res.status}`);
    console.log(JSON.stringify(await res.json(), null, 2).slice(0, 4000));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
