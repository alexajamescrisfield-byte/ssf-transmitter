// Read-only: find our SSF Receiver's actual stored configuration
// (specifically Subject ID Format) to check whether it differs from
// what a teammate's separate tenant might be using -- the most likely
// explanation for their "need complex format" finding not matching our
// own repeated, verified results with the flat format.
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

  const res = await fetch(`${apiBase}/beta/sources?filters=${encodeURIComponent('name co "Threat Signal"')}`, {
    headers: auth,
  });
  console.log(`GET /beta/sources?filters=name co "Threat Signal" -> ${res.status}`);
  const text = await res.text();
  console.log(text.slice(0, 3000));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
