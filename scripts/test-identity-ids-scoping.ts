// Read-only-safe test (creates a STAGED, non-activated campaign -- no
// emails sent): does searchCampaignInfo.identityIds correctly scope a
// type:"IDENTITY" campaign, without needing a hand-built query string?
// If yes, a Workflow HTTP-request step can use a clean JSONPath
// full-value substitution ("identityIds.$": "$.trigger...id") instead of
// string-templating a query, which sp:http doesn't cleanly support.
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

  const body = {
    name: "TEST identityIds scoping (safe to delete)",
    description: "Throwaway test -- confirms identityIds scopes a type:IDENTITY search campaign without a query string.",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    type: "SEARCH",
    emailNotificationEnabled: false,
    autoRevokeAllowed: false,
    activateUponCreation: false,
    searchCampaignInfo: {
      type: "IDENTITY",
      identityIds: [IDENTITY_ID],
      reviewer: { type: "MANAGER" },
    },
  };

  const res = await fetch(`${apiBase}/v3/campaigns`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`status: ${res.status}`);
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
