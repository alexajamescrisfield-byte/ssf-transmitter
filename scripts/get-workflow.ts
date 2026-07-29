// Read-only diagnostic: fetch the live Workflow definition by name or id so
// we can see its real JSON structure before proposing any edit.
// Usage: npx tsx scripts/get-workflow.ts "<workflow name or id>"
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
  const nameArg = process.argv[2];
  if (!nameArg) {
    console.error('Usage: npx tsx scripts/get-workflow.ts "<workflow name or id>"');
    process.exit(1);
  }

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
  if (!tokenRes.ok) {
    console.error("Token request failed:", tokenRes.status, await tokenRes.text());
    process.exit(1);
  }
  const { access_token } = await tokenRes.json();
  const auth = { Authorization: `Bearer ${access_token}` };

  const listRes = await fetch(`${apiBase}/beta/workflows`, { headers: auth });
  if (!listRes.ok) {
    console.error("List workflows failed:", listRes.status, await listRes.text());
    process.exit(1);
  }
  const workflows = await listRes.json();

  const matches = workflows.filter(
    (w: { name: string; id: string }) =>
      w.id === nameArg || w.name.toLowerCase().includes(nameArg.toLowerCase()),
  );

  if (matches.length === 0) {
    console.log(
      "No match. All workflow names visible to this client:",
      workflows.map((w: { name: string }) => w.name),
    );
    return;
  }

  for (const w of matches) {
    console.log("====", w.name, "====");
    console.log("id:", w.id);
    console.log("enabled:", w.enabled);
    console.log("trigger:", JSON.stringify(w.trigger, null, 2));
    console.log("definition:", JSON.stringify(w.definition, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
