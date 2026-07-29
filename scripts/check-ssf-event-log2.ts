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

  const candidates = [
    "beta/sse-feed/events",
    "beta/sse-feed/status",
    "beta/notification-configs",
    "beta/shared-signals-receivers",
    "beta/receivers",
    "beta/ssf-receivers",
    "v3/shared-signals",
    "beta/shared-signals",
    "beta/security-event-tokens",
    "beta/sse-events",
    "beta/audit-events?filters=" + encodeURIComponent('type eq "SSF"'),
  ];
  for (const path of candidates) {
    const res = await fetch(`${apiBase}/${path}`, { headers: auth });
    console.log(`GET /${path} -> ${res.status}`);
    if (res.status !== 404) console.log((await res.text()).slice(0, 600));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
