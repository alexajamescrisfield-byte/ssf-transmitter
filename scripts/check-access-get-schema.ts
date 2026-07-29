// Read-only diagnostic: fetch sp:access:get's full schema (input/output shape)
// so a Create Certification Campaign fix can be wired correctly.
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
  const actions = list.filter((t: any) => t.type === "ACTION");

  for (const id of ["sp:access:get", "sp:get-accounts", "sp:get-identity"]) {
    const match = actions.find((a: any) => a.id === id);
    console.log(`\n=== ${id} full detail ===`);
    console.log(JSON.stringify(match, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
