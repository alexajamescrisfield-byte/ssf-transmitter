// Read-only: broader search for any native action that can set/update an
// identity attribute (not lifecycle state directly) -- if Identity
// Profiles support criteria-based automatic lifecycle state transitions,
// setting an attribute via a native action could let ISC itself perform
// the actual Quarantine transition, with zero external write path.
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

  const res = await fetch(`${apiBase}/beta/workflow-library`, { headers: auth });
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.items ?? [];

  for (const term of ["attribute", "update", "identity-attribute", "set-attribute", "manual-work-item", "account:manage"]) {
    const matches = list.filter((t: any) =>
      JSON.stringify(t).toLowerCase().includes(term.toLowerCase()),
    );
    console.log(`\n"${term}": ${matches.length} matches`);
    for (const m of matches) {
      console.log(`  id=${m.id}  name=${m.name}  type=${m.type}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
