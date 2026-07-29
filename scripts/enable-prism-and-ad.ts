// Re-enables Jayme Cannon's PRISM and Active Directory accounts.
import { readFileSync } from "fs";
import { join } from "path";

const ACCOUNT_IDS = [
  "84e0ebbfda954d9c9f2a4c8242b6ce6d", // PRISM
  "86356ca141824f4fa1e717d4dadd8643", // Active Directory
];

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

  for (const id of ACCOUNT_IDS) {
    const res = await fetch(`${apiBase}/v3/accounts/${id}/enable`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    console.log(`enable ${id}: ${res.status}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
