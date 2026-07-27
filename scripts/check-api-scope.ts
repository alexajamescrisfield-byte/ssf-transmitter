// Throwaway diagnostic: check what the company21912 OAuth client can
// actually access -- read-only identity lookups are confirmed working;
// this checks whether it also has admin-level read/write scope.
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
  const { access_token } = await tokenRes.json();

  // Decode the token itself to see what scope/authorities it was granted --
  // read-only inspection, no API calls yet.
  const parts = access_token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
  console.log("Token payload (scope/authorities):");
  console.log(JSON.stringify(payload, null, 2));

  // Try a read on an admin-level resource (sources list) as a probe --
  // read-only, does not modify anything.
  const sourcesRes = await fetch(`${apiBase}/v3/sources?limit=5`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  console.log("\nGET /v3/sources status:", sourcesRes.status);
  if (sourcesRes.ok) {
    const sources = await sourcesRes.json();
    console.log(
      "Sources visible:",
      sources.map((s: { name: string }) => s.name),
    );
  } else {
    console.log("Body:", await sourcesRes.text());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
