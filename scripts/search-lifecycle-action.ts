// Read-only: search the full workflow-library for anything related to
// setting an identity's lifecycle state, before assuming an sp:http
// workaround is needed (lesson from today's certification-campaign fix:
// check the native action schema first).
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

  const matches = list.filter((t: any) =>
    JSON.stringify(t).toLowerCase().includes("lifecycle"),
  );
  console.log(`${matches.length} items mention "lifecycle":`);
  for (const m of matches) {
    console.log(`  id=${m.id}  name=${m.name}  type=${m.type}`);
  }

  // Also print every ACTION id/name once more, in case an update-identity
  // style action exists under a non-obvious name.
  const actions = list.filter((t: any) => t.type === "ACTION");
  console.log(`\nAll ${actions.length} ACTION entries (for manual scan):`);
  const seen = new Set<string>();
  for (const a of actions) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      console.log(`  ${a.id}  --  ${a.name}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
