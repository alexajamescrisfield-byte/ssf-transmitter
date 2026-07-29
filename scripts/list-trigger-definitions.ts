// Read-only: list ISC's trigger definitions to find the exact IDs for the
// CAEP event triggers, so we don't have to guess them when building new
// Workflows via the API.
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
  const auth = { Authorization: `Bearer ${access_token}` };

  for (const path of ["/beta/triggers"]) {
    const res = await fetch(`${apiBase}${path}`, { headers: auth });
    console.log(`GET ${path} ->`, res.status);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items ?? [data]);
      const caep = list.filter((t: any) =>
        JSON.stringify(t).toLowerCase().includes("caep"),
      );
      for (const t of caep) {
        console.log(`id=${t.id}  name=${t.name}`);
      }
    } else {
      console.log(await res.text());
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
