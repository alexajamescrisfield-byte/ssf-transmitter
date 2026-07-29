// Test-execute a Workflow via POST /beta/workflows/{id}/test with a
// synthetic input matching the real trigger shape. Used to validate
// whether Workflow Studio's "Test" feature is a safe dry-run (actions
// marked isSimulationEnabled) or actually performs real side effects --
// check immediately afterward for a new campaign/email before assuming
// either way.
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
  const workflowId = process.argv[2] ?? "089b0904-af1d-409d-bae9-2fe4e6dfa3b2";
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

  const now = Math.floor(Date.now() / 1000);
  const input = {
    pk: "test-execution-probe#00236705f36b407199b11592af378ef3",
    correlatedID: { format: "email" },
    identityAttributes: {
      id: "00236705f36b407199b11592af378ef3",
      name: "Jayme.Cannon",
    },
    ssfEvent: {
      aud: ["https://ssf-transmitter-chi.vercel.app/t/company21912-poc"],
      events: {
        "https://schemas.openid.net/secevent/caep/event-type/token-claims-change": {
          claims: {},
          event_timestamp: now,
          initiating_entity: "policy",
        },
      },
      iat: now,
      iss: "https://ssf-transmitter-chi.vercel.app/t/company21912-poc",
      jti: "test-execution-probe",
      sub_id: { email: "Jayme.Cannon@sailpointdemo.com", format: "email" },
    },
  };

  const res = await fetch(`${apiBase}/beta/workflows/${workflowId}/test`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  console.log(`status: ${res.status}`);
  console.log(await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
