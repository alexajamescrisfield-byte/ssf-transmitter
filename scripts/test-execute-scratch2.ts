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
  const workflowId = "9061b200-dfd9-4f4b-bac9-df7a7c8dc9bb";
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
  const res = await fetch(`${apiBase}/beta/workflows/${workflowId}/test`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        testSlug: "company21912-poc",
        pk: "scratch#test",
        correlatedID: { format: "email" },
        identityAttributes: { id: "x", name: "x" },
        ssfEvent: {
          aud: ["x"],
          events: { "https://schemas.openid.net/secevent/caep/event-type/risk-level-change": { current_level: "HIGH", previous_level: "LOW", event_timestamp: now } },
          iat: now,
          iss: "https://ssf-transmitter-chi.vercel.app/t/company21912-poc",
          jti: "x",
          sub_id: { email: "x@x.com", format: "email" },
        },
      },
    }),
  });
  console.log(`test status: ${res.status}`);
  const text = await res.text();
  console.log(text);

  if (res.ok) {
    const { workflowExecutionId } = JSON.parse(text);
    await new Promise((r) => setTimeout(r, 5000));
    const histRes = await fetch(`${apiBase}/beta/workflow-executions/${workflowExecutionId}/history`, { headers: auth });
    console.log("\nhistory:");
    console.log(JSON.stringify(await histRes.json(), null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
