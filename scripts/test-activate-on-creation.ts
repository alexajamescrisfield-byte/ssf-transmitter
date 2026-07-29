// Safe test: activateUponCreation:true + emailNotificationEnabled:false --
// creates an ACTIVE campaign but sends no email. Confirms the one-shot
// create+activate pattern the Workflow's HTTP step will rely on.
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
    name: "TEST activateUponCreation (safe, no email)",
    description: "Throwaway test -- does activateUponCreation:true skip the separate /activate call?",
    type: "SEARCH",
    emailNotificationEnabled: false,
    autoRevokeAllowed: false,
    activateUponCreation: true,
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
  const text = await res.text();
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
