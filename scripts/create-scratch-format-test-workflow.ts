// Creates a disposable scratch Workflow with a single HTTP GET step that
// calls our OWN transmitter's public discovery endpoint, with the tenant
// slug embedded via a candidate templating syntax
// (States.Format-style). If the URL resolves correctly (200, real
// discovery JSON back), that syntax works for the real fix. Delete this
// workflow after the experiment.
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

  const definition = {
    start: "Test HTTP",
    steps: {
      "Test HTTP": {
        actionId: "sp:http",
        attributes: {
          authenticationType: "none",
          method: "get",
          "url.$":
            "States.Format('https://ssf-transmitter-chi.vercel.app/t/{}/.well-known/ssf-configuration', $.trigger.testSlug)",
        },
        type: "action",
        nextStep: "success 1",
        versionNumber: 2,
      },
      "success 1": {
        actionId: "sp:operator-success",
        type: "success",
        displayName: "End",
      },
    },
  };

  const body = {
    name: "SCRATCH - URL templating test (delete me)",
    description: "Throwaway workflow testing States.Format URL templating in sp:http",
    enabled: false,
    trigger: { type: "EVENT", attributes: { id: "idn:caep-risk-level-change-events" } },
    definition,
  };

  const res = await fetch(`${apiBase}/beta/workflows`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`create status: ${res.status}`);
  const text = await res.text();
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
