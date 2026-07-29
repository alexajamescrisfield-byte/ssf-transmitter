// Experiment: does ISC's trigger FILTER see custom claims (like `vendor`)
// even though the Workflow's own $.trigger input has them stripped?
//
// Plan:
//   1. Temporarily add `&& @.vendor == "Jamf"` to the device-compliance
//      Workflow's filter.
//   2. Send a signal with vendor: "Jamf" -- should still fire if the
//      filter can see custom claims.
//   3. Send an otherwise-identical signal with vendor: "NotJamfTest" --
//      should NOT fire if the filter really evaluates vendor.
//   4. Compare execution counts to get a definitive answer.
//   5. Revert the filter back to its original form regardless of outcome.
import { readFileSync } from "fs";
import { join } from "path";
import { sendSsfSignal } from "../lib/ssf";
import { prisma } from "../lib/prisma";

const WORKFLOW_ID = "a31a6d25-755b-4ac2-9835-763f0f3de6b3";
const STREAM_ID = "cms3q1gtr000004icv23hv0o3";
const TENANT_SLUG = "company21912-poc";

const ORIGINAL_FILTER =
  '$.ssfEvent.events["https://schemas.openid.net/secevent/caep/event-type/device-compliance-change"][?(@.current_status == "not-compliant")]';
const VENDOR_TEST_FILTER =
  '$.ssfEvent.events["https://schemas.openid.net/secevent/caep/event-type/device-compliance-change"][?(@.current_status == "not-compliant" && @.vendor == "Jamf")]';

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

async function patchWorkflow(apiBase: string, auth: Record<string, string>, ops: unknown[]) {
  const res = await fetch(`${apiBase}/beta/workflows/${WORKFLOW_ID}`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(ops),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function setFilter(apiBase: string, auth: Record<string, string>, filter: string) {
  await patchWorkflow(apiBase, auth, [{ op: "replace", path: "/enabled", value: false }]);
  const patchResult = await patchWorkflow(apiBase, auth, [
    {
      op: "replace",
      path: "/trigger/attributes",
      value: {
        id: "idn:caep-device-compliance-change-events",
        "filter.$": filter,
      },
    },
  ]);
  await patchWorkflow(apiBase, auth, [{ op: "replace", path: "/enabled", value: true }]);
  return patchResult;
}

async function executionCount(apiBase: string, auth: Record<string, string>) {
  const res = await fetch(`${apiBase}/beta/workflows/${WORKFLOW_ID}/executions?limit=50`, {
    headers: auth,
  });
  const executions = await res.json();
  return executions.length;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  console.log("Step 1: setting vendor-conditioned test filter...");
  const setResult = await setFilter(apiBase, auth, VENDOR_TEST_FILTER);
  console.log("  patch status:", setResult.status);

  const baseline = await executionCount(apiBase, auth);
  console.log("  baseline execution count:", baseline);

  console.log("\nStep 2: sending signal with vendor='Jamf' (should fire if filter sees vendor)...");
  await sendSsfSignal({
    tenantSlug: TENANT_SLUG,
    streamId: STREAM_ID,
    event: {
      type: "device-compliance-change",
      subjectEmail: "Jayme.Cannon@sailpointdemo.com",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "Jamf",
    },
  });
  await sleep(10000);
  const afterJamf = await executionCount(apiBase, auth);
  console.log("  execution count after Jamf-vendor send:", afterJamf, afterJamf > baseline ? "-> FIRED" : "-> did not fire");

  console.log("\nStep 3: sending otherwise-identical signal with vendor='NotJamfTest' (should NOT fire if filter sees vendor)...");
  await sendSsfSignal({
    tenantSlug: TENANT_SLUG,
    streamId: STREAM_ID,
    event: {
      type: "device-compliance-change",
      subjectEmail: "Jayme.Cannon@sailpointdemo.com",
      claims: { current_status: "not-compliant", previous_status: "compliant" },
      vendor: "NotJamfTest",
    },
  });
  await sleep(10000);
  const afterOther = await executionCount(apiBase, auth);
  console.log("  execution count after other-vendor send:", afterOther, afterOther > afterJamf ? "-> FIRED (unexpected)" : "-> did not fire");

  console.log("\nStep 4: reverting filter back to original (no vendor condition)...");
  const revertResult = await setFilter(apiBase, auth, ORIGINAL_FILTER);
  console.log("  revert status:", revertResult.status);

  console.log("\n=== RESULT ===");
  if (afterJamf > baseline && afterOther === afterJamf) {
    console.log("CONFIRMED: the trigger filter CAN see custom claims like `vendor`.");
    console.log("Jamf-vendor signal fired; other-vendor signal did not. Per-vendor filtering is viable.");
  } else if (afterJamf === baseline) {
    console.log("INCONCLUSIVE: even the Jamf-vendor signal didn't fire -- filter may not see vendor at all, or something else is wrong. Check Event Log.");
  } else {
    console.log("The other-vendor signal ALSO fired -- the filter does NOT effectively restrict by vendor (matches spec: custom claims stripped before filter evaluation too, or filter silently ignores unknown claim in comparison).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
