// Adds a "Get Identity's Manager" step (same working pattern as the
// credential-change/session-revoked Workflows) and populates the
// previously-empty "Send Email" step with an HTML risk-detail body.
//
// Deliberately does NOT reference vendor/vendor_event_type/recommended_action
// in the email -- confirmed (again, empirically, via a real trigger payload
// captured earlier today) that ISC strips these before a Workflow ever sees
// them. reason_admin is used instead: it IS preserved (official CAEP claim)
// and already carries vendor-style narrative context (e.g. "CrowdStrike:
// Host Isolated").
import { readFileSync } from "fs";
import { join } from "path";

const WORKFLOW_ID = "d7ee6b95-7109-44fd-bfdc-240032ad5c29";
const RISK_EVENT_URI = "https://schemas.openid.net/secevent/caep/event-type/risk-level-change";

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

  console.log("disabling workflow...");
  console.log((await patchWorkflow(apiBase, auth, [{ op: "replace", path: "/enabled", value: false }])).status);

  const newDefinition = [
    {
      op: "replace",
      path: "/definition",
      value: {
        start: "Get Identity",
        steps: {
          "Get Identity": {
            actionId: "sp:get-identity",
            attributes: { "id.$": "$.trigger.identityAttributes.id" },
            description: "This action returns attributes associated with the identity.",
            displayName: "Get Identity",
            nextStep: "Get Accounts",
            type: "action",
            versionNumber: 2,
          },
          "Get Accounts": {
            actionId: "sp:get-accounts",
            attributes: {
              getAccountsBy: "specificIdentity",
              "identity.$": "$.trigger.identityAttributes.id",
            },
            description: "This action returns the identity's current list of accounts.",
            displayName: "Get Identity's Accounts",
            nextStep: "Check Recommended Action",
            type: "action",
            versionNumber: 1,
          },
          "Check Recommended Action": {
            actionId: "sp:compare-strings",
            type: "choice",
            displayName: "Check Recommended Action",
            description:
              "Branches on the recommended_action claim from the CAEP signal so this workflow can support future action types beyond disabling accounts.",
            choiceList: [
              {
                comparator: "StringEquals",
                nextStep: "Manage Accounts",
                "variableA.$": `$.trigger.ssfEvent.events["${RISK_EVENT_URI}"].recommended_action`,
                variableB: "disable_account",
              },
            ],
            defaultStep: "Manage Accounts",
          },
          "Manage Accounts": {
            actionId: "sp:manage-account",
            attributes: {
              "accountIds.$": '$.getAccounts.accounts[?(@.sourceId=="8c63bd999dd74afcb4e344ba0466ae9b")].id',
              operation: "disable",
            },
            description: "This action disables all accounts returned by the Get Accounts step.",
            displayName: "Disable Accounts",
            nextStep: "Get Identity 1",
            type: "action",
            versionNumber: 1,
          },
          "Get Identity 1": {
            actionId: "sp:get-identity",
            attributes: { "id.$": "$.getIdentity.managerRef.id" },
            description: "This action returns the name and other attributes about the identity's manager.",
            displayName: "Get Identity's Manager",
            nextStep: "Send Email",
            type: "action",
            versionNumber: 2,
          },
          "Send Email": {
            actionId: "sp:send-email",
            attributes: {
              subject: "High Risk Level Detected — Access Automatically Restricted",
              "recipientEmailList.$": "$.getIdentity1.attributes.email",
              carbonCopy: ["alexa.delgado@sailpoint.com"],
              // Email-safe HTML: table-based layout, all styling inline (no
              // <style> block -- most email clients strip it). Branded
              // header banner, colored risk-level badges, callout box for
              // the action taken, footer -- not just a bare unstyled table.
              body:
                '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;font-family:Segoe UI,Arial,sans-serif;">' +
                "<tr><td align=\"center\">" +
                '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">' +
                "<tr><td style=\"background:#7a1f2b;padding:20px 32px;\">" +
                '<table role="presentation" width="100%"><tr>' +
                '<td style="color:#ffffff;font-size:20px;font-weight:bold;font-family:Segoe UI,Arial,sans-serif;">SailPoint Security Alert</td>' +
                '<td align="right" style="color:#f2c6cb;font-size:12px;letter-spacing:1px;font-family:Segoe UI,Arial,sans-serif;">RISK LEVEL CHANGE</td>' +
                "</tr></table>" +
                "</td></tr>" +
                '<tr><td style="padding:28px 32px 8px 32px;">' +
                '<p style="margin:0 0 16px 0;font-size:15px;color:#1a1a1a;">Hello ${var1},</p>' +
                '<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.5;">A <strong>risk-level-change</strong> security signal was detected for your direct report, <strong>${var2}</strong>. SailPoint has automatically taken remediation action on their account.</p>' +
                "</td></tr>" +
                '<tr><td style="padding:0 32px 24px 32px;">' +
                '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5ea;border-radius:6px;">' +
                '<tr style="background:#f7f2f3;"><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:bold;letter-spacing:0.5px;color:#7a1f2b;border-bottom:1px solid #e5e5ea;">RISK DETAIL</td></tr>' +
                '<tr><td style="padding:12px 16px;font-size:13px;color:#666666;width:45%;border-bottom:1px solid #f0f0f0;">Previous risk level</td>' +
                '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;"><span style="display:inline-block;padding:3px 10px;border-radius:12px;background:#e8f0e9;color:#2e7d32;font-weight:bold;font-size:12px;">${var3}</span></td></tr>' +
                '<tr><td style="padding:12px 16px;font-size:13px;color:#666666;border-bottom:1px solid #f0f0f0;">Current risk level</td>' +
                '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;"><span style="display:inline-block;padding:3px 10px;border-radius:12px;background:#fbe4e6;color:#b3261e;font-weight:bold;font-size:12px;">${var4}</span></td></tr>' +
                '<tr><td style="padding:12px 16px;font-size:13px;color:#666666;">Details</td>' +
                '<td style="padding:12px 16px;font-size:13px;color:#333333;">${var5}</td></tr>' +
                "</table></td></tr>" +
                '<tr><td style="padding:0 32px 28px 32px;">' +
                '<div style="background:#fff8e1;border-left:4px solid #f5a623;padding:12px 16px;font-size:13px;color:#7a5c00;border-radius:0 4px 4px 0;">' +
                "<strong>Action taken:</strong> Access to the identity's <strong>PRISM</strong> application has been automatically disabled pending review." +
                "</div></td></tr>" +
                '<tr><td style="background:#f4f4f7;padding:20px 32px;border-top:1px solid #e5e5ea;">' +
                '<p style="margin:0;font-size:12px;color:#888888;">Thank you,<br><strong style="color:#333333;">Corporate Compliance Officer</strong></p>' +
                '<p style="margin:12px 0 0 0;font-size:11px;color:#aaaaaa;">This is an automated notification from the SSF Threat Signal Transmitter demo.</p>' +
                "</td></tr>" +
                "</table></td></tr></table>",
              context: {
                "var1.$": "$.getIdentity1.attributes.firstname",
                "var2.$": "$.getIdentity.attributes.displayName",
                "var3.$": `$.trigger.ssfEvent.events["${RISK_EVENT_URI}"].previous_level`,
                "var4.$": `$.trigger.ssfEvent.events["${RISK_EVENT_URI}"].current_level`,
                "var5.$": `$.trigger.ssfEvent.events["${RISK_EVENT_URI}"].reason_admin.en`,
              },
            },
            description: "Notifies the identity's manager with risk detail.",
            displayName: "Send Email",
            nextStep: "success 1",
            type: "action",
            versionNumber: 2,
          },
          "success 1": {
            actionId: "sp:operator-success",
            description:
              "All returned accounts are disabled and the manager has been emailed. The workflow finishes in a Success state.",
            displayName: "End Step - Success",
            type: "success",
          },
        },
      },
    },
  ];

  console.log("updating definition (manager lookup + HTML risk-detail email)...");
  const defResult = await patchWorkflow(apiBase, auth, newDefinition);
  console.log(defResult.status, defResult.text.slice(0, 600));

  console.log("re-enabling workflow...");
  console.log((await patchWorkflow(apiBase, auth, [{ op: "replace", path: "/enabled", value: true }])).status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
