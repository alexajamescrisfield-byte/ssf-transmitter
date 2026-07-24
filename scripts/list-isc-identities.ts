// Throwaway diagnostic: use the OAuth client credentials already in
// company21912/.env.local to look up a handful of real identities in the
// ISC tenant, so we can pick a real subject email for a test signal.
import { readFileSync } from "fs";
import { join } from "path";

function loadEnvLocal() {
  const path = join(
    "C:\\Users\\delga\\OneDrive\\Documents\\company21912",
    ".env.local",
  );
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

  if (!tokenRes.ok) {
    console.error("Token request failed:", tokenRes.status, await tokenRes.text());
    process.exit(1);
  }

  const { access_token } = await tokenRes.json();

  const identitiesRes = await fetch(
    `${apiBase}/v3/public-identities?limit=10`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  );

  if (!identitiesRes.ok) {
    console.error(
      "Identities request failed:",
      identitiesRes.status,
      await identitiesRes.text(),
    );
    process.exit(1);
  }

  const identities = await identitiesRes.json();
  for (const id of identities) {
    console.log("----");
    console.log("name:", id.name);
    console.log("email:", id.email);
    console.log("id:", id.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
