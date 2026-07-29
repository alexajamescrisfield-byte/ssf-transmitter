// Read-only: find Jayme Cannon's real entitlement IDs via candidate API
// endpoints, so a certification campaign can be scoped to explicit
// access-item IDs instead of a guessed search query.
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
  const identityId = process.argv[2] ?? "00236705f36b407199b11592af378ef3";
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
    `v3/identities/${identityId}/entitlements`,
    `beta/identities/${identityId}/entitlements`,
    `v3/historical-identities/${identityId}/entitlements`,
  ];
  for (const path of candidates) {
    const res = await fetch(`${apiBase}/${path}`, { headers: auth });
    console.log(`GET /${path} -> ${res.status}`);
    if (res.ok) console.log(JSON.stringify(await res.json(), null, 2).slice(0, 2000));
    else console.log((await res.text()).slice(0, 300));
  }

  // Search API attempt (read-only)
  const searchBody = {
    indices: ["entitlements"],
    query: { query: `identities.id:"${identityId}"` },
    limit: 50,
  };
  const searchRes = await fetch(`${apiBase}/v3/search`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(searchBody),
  });
  console.log(`\nPOST /v3/search (entitlements, identities.id) -> ${searchRes.status}`);
  console.log(JSON.stringify(await searchRes.json(), null, 2).slice(0, 3000));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
