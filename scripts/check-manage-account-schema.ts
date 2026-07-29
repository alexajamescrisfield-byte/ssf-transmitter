// Read-only: check sp:manage-account's full schema -- what operations
// does it actually support (disable/enable/unlock/reset-password/etc)?
// This determines whether credential-change and session-revoked can get
// a more specific, relevant demo action than the generic "disable PRISM"
// already used for risk-level-change/device-compliance-change.
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

  for (const id of ["sp:manage-account", "sp:access:manage"]) {
    const match = list.find((a: any) => a.id === id);
    console.log(`\n=== ${id} ===`);
    console.log(JSON.stringify(match, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
