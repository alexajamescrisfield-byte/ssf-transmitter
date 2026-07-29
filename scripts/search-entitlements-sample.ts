// Read-only: sample the entitlements search index to learn its real field
// shape (how identity ownership is represented), then try scoping to
// Jayme Cannon specifically.
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

  const res = await fetch(`${apiBase}/v3/search`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ indices: ["entitlements"], query: { query: "*" }, limit: 2 }),
  });
  console.log(`POST /v3/search (entitlements, *) -> ${res.status}`);
  console.log(JSON.stringify(await res.json(), null, 2));

  const identityId = "00236705f36b407199b11592af378ef3";
  for (const q of [
    `owner.id:"${identityId}"`,
    `identity.id:"${identityId}"`,
    `identityId:"${identityId}"`,
  ]) {
    const r = await fetch(`${apiBase}/v3/search`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ indices: ["entitlements"], query: { query: q }, limit: 10 }),
    });
    const body = await r.json();
    console.log(`\nquery="${q}" -> ${r.status}, ${Array.isArray(body) ? body.length : "?"} results`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
