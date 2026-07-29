// Read-only-safe test (staged, non-notifying): can "deadline" be omitted
// from the create-campaign body, letting ISC default it? This matters
// because the Workflow's HTTP step can't easily compute a future date via
// JSONPath substitution alone.
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

  const body = {
    name: "TEST no-deadline (safe, staged, no email)",
    description: "Throwaway test -- does ISC default a deadline if omitted?",
    type: "SEARCH",
    emailNotificationEnabled: false,
    autoRevokeAllowed: false,
    activateUponCreation: false,
    searchCampaignInfo: {
      type: "IDENTITY",
      identityIds: ["00236705f36b407199b11592af378ef3"],
      reviewer: { type: "MANAGER" },
    },
  };

  const res = await fetch(`${apiBase}/v3/campaigns`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`status: ${res.status}`);
  console.log(await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
