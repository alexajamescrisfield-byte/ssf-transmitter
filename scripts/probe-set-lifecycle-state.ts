// Safe probe: "quarantine" doesn't exist as a configured lifecycle state
// yet, so calling set-lifecycle-state with that name will error out
// without actually changing anything -- confirms the real endpoint shape
// before building the Workflow step around it.
import { readFileSync } from "fs";
import { join } from "path";

const IDENTITY_ID = "00236705f36b407199b11592af378ef3"; // Jayme.Cannon

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

  const res = await fetch(`${apiBase}/v3/identities/${IDENTITY_ID}/set-lifecycle-state`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ lifecycleState: "quarantine" }),
  });
  console.log(`status: ${res.status}`);
  console.log(await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
