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

  const ops = [
    {
      op: "replace",
      path: "/definition/steps/Test HTTP/attributes",
      value: {
        method: "post",
        url: "https://httpbin.org/post",
        requestContentType: "json",
        jsonRequestBody: {
          name: "static-value",
          "identityIds.$": "$.trigger.identityAttributes.id",
          nested: {
            "innerId.$": "$.trigger.identityAttributes.id",
          },
        },
      },
    },
  ];

  const res = await fetch(`${apiBase}/beta/workflows/${workflowId}`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(ops),
  });
  console.log(`patch status: ${res.status}`);
  console.log(await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
