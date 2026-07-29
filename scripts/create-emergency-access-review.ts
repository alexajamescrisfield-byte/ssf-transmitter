// Creates the "Emergency Access Review" certification campaign directly
// via the public v3/campaigns API, bypassing the buggy sp:create-campaign
// Workflow action (which always searches type:"ACCESS" query:"*" -- an
// org-wide access-item search that exceeds the 10,000-item guard).
//
// Uses searchCampaignInfo.type: "IDENTITY" with a query scoped to just
// Jayme Cannon on the identities index, and reviewer.type: "MANAGER" so
// ISC auto-resolves her manager (Martena Heath) as reviewer -- a real
// manager certification.
//
// Created with activateUponCreation: false (STAGED) deliberately -- no
// email goes out until a separate, explicit activation step confirms the
// scope is correct (small decision count, not another 10,000+ error).
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

  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const body = {
    name: "Emergency Access Review",
    description:
      "Emergency access review for Jayme.Cannon, triggered by a Zscaler token-claims-change (risk posture) signal via the SSF Threat Signal Transmitter.",
    deadline,
    type: "SEARCH",
    emailNotificationEnabled: true,
    autoRevokeAllowed: false,
    activateUponCreation: false,
    searchCampaignInfo: {
      type: "IDENTITY",
      query: `id:"${IDENTITY_ID}"`,
      description: "Certify all access for the identity flagged by the risk signal.",
      reviewer: {
        type: "MANAGER",
      },
    },
  };

  console.log("POST /v3/campaigns body:", JSON.stringify(body, null, 2));

  const res = await fetch(`${apiBase}/v3/campaigns`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`\nstatus: ${res.status}`);
  console.log(await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
