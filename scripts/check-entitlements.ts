// Read-only: check whether Jayme Cannon has any entitlements at all across
// her accounts, to test the hypothesis that an empty certification scope
// caused the campaign-generation failure.
import { readFileSync } from "fs";
import { join } from "path";

const IDENTITY_ID = "00236705f36b407199b11592af378ef3";

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

  for (const path of [
    `/v3/identities/${IDENTITY_ID}/access-items?type=entitlement&limit=50`,
    `/v3/identities/${IDENTITY_ID}/access`,
  ]) {
    const res = await fetch(`${apiBase}${path}`, { headers: auth });
    console.log(`GET ${path} -> status:`, res.status);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items ?? [];
      console.log(`  count: ${list.length}`);
      console.log(JSON.stringify(list.slice(0, 3), null, 2));
    } else {
      console.log("  ", (await res.text()).slice(0, 200));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
