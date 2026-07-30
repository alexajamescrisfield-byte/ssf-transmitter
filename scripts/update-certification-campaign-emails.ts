// Adds a branded HTML "Send Email" body to the 3 Workflows that create a
// certification campaign (credential-change, session-revoked,
// token-claims-change) -- same email-safe pattern as
// update-risk-level-change-email.ts (table-based layout, all styling
// inline), but with a distinct amber/gold banner instead of that email's
// maroon, so a recipient can tell "certification review" apart from
// "access disabled" at a glance. Every other step in each Workflow is left
// byte-for-byte unchanged -- only the Send Email step's subject/body/
// context attributes are replaced.
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

async function patchWorkflow(apiBase: string, auth: Record<string, string>, workflowId: string, ops: unknown[]) {
  const res = await fetch(`${apiBase}/beta/workflows/${workflowId}`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(ops),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

function buildEmailBody(opts: { bannerLabel: string; introSentence: string; actionTakenHtml: string }): string {
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;font-family:Segoe UI,Arial,sans-serif;">' +
    "<tr><td align=\"center\">" +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">' +
    "<tr><td style=\"background:#8a5b00;padding:20px 32px;\">" +
    '<table role="presentation" width="100%"><tr>' +
    '<td style="color:#ffffff;font-size:20px;font-weight:bold;font-family:Segoe UI,Arial,sans-serif;">SailPoint Certification Campaign</td>' +
    `<td align="right" style="color:#f0d9a8;font-size:12px;letter-spacing:1px;font-family:Segoe UI,Arial,sans-serif;">${opts.bannerLabel}</td>` +
    "</tr></table>" +
    "</td></tr>" +
    '<tr><td style="padding:28px 32px 8px 32px;">' +
    '<p style="margin:0 0 16px 0;font-size:15px;color:#1a1a1a;">Hello ${var1},</p>' +
    `<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.5;">${opts.introSentence}</p>` +
    "</td></tr>" +
    '<tr><td style="padding:0 32px 24px 32px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5ddc8;border-radius:6px;">' +
    '<tr style="background:#faf3e2;"><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:bold;letter-spacing:0.5px;color:#8a5b00;border-bottom:1px solid #e5ddc8;">CAMPAIGN DETAIL</td></tr>' +
    '<tr><td style="padding:12px 16px;font-size:13px;color:#666666;width:40%;border-bottom:1px solid #f0f0f0;">Identity under review</td>' +
    '<td style="padding:12px 16px;font-size:13px;color:#333333;border-bottom:1px solid #f0f0f0;">${var2}</td></tr>' +
    '<tr><td style="padding:12px 16px;font-size:13px;color:#666666;border-bottom:1px solid #f0f0f0;">Campaign name</td>' +
    '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;"><span style="display:inline-block;padding:3px 10px;border-radius:12px;background:#faf3e2;color:#8a5b00;font-weight:bold;font-size:12px;">${var4}</span></td></tr>' +
    '<tr><td style="padding:12px 16px;font-size:13px;color:#666666;">Details</td>' +
    '<td style="padding:12px 16px;font-size:13px;color:#333333;">${var5}</td></tr>' +
    "</table></td></tr>" +
    '<tr><td style="padding:0 32px 28px 32px;">' +
    '<div style="background:#eef4fb;border-left:4px solid #3b6fa0;padding:12px 16px;font-size:13px;color:#2c4f70;border-radius:0 4px 4px 0;">' +
    `<strong>Action taken:</strong> ${opts.actionTakenHtml} Please complete the review within 30 days.` +
    "</div></td></tr>" +
    '<tr><td style="background:#f4f4f7;padding:20px 32px;border-top:1px solid #e5e5ea;">' +
    '<p style="margin:0;font-size:12px;color:#888888;">Thank you,<br><strong style="color:#333333;">Corporate Compliance Officer</strong></p>' +
    '<p style="margin:12px 0 0 0;font-size:11px;color:#aaaaaa;">This is an automated notification from the SSF Threat Signal Transmitter demo.</p>' +
    "</td></tr>" +
    "</table></td></tr></table>"
  );
}

function emailContext(eventUri: string) {
  return {
    "var1.$": "$.getIdentity1.attributes.firstname",
    "var2.$": "$.getIdentity.attributes.displayName",
    "var4.$": "$.createCertificationCampaign.name",
    "var5.$": `$.trigger.ssfEvent.events["${eventUri}"].reason_admin.en`,
  };
}

const CREDENTIAL_CHANGE_URI = "https://schemas.openid.net/secevent/caep/event-type/credential-change";
const SESSION_REVOKED_URI = "https://schemas.openid.net/secevent/caep/event-type/session-revoked";
const TOKEN_CLAIMS_URI = "https://schemas.openid.net/secevent/caep/event-type/token-claims-change";

const DISABLE_PRISM_AD_ACTION =
  "Access to the identity's <strong>PRISM</strong> application and <strong>Active Directory</strong> has been automatically disabled, and a certification campaign has been created for review.";
const CAMPAIGN_ONLY_ACTION =
  "A certification campaign has been created for review. No account access was changed automatically for this event type.";

const WORKFLOWS: {
  id: string;
  label: string;
  definition: Record<string, unknown>;
}[] = [
  {
    id: "bd3f6b7d-85a7-47b4-be57-b87399f45196",
    label: "credential-change",
    definition: {
      start: "Get Identity",
      steps: {
        "Create Certification Campaign": {
          actionId: "sp:create-campaign",
          attributes: {
            activateUponCreation: true,
            description: "Credential change access review, triggered by the SSF Threat Signal Transmitter.",
            duration: "30d",
            emailNotificationEnabled: true,
            name: "Credential Change Access Review",
            reviewerCertificationType: "IDENTITY",
            "reviewerId.$": "$.getIdentity.managerRef.id",
            "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
            type: "REVIEWER_IDENTITY",
          },
          description: "Creates a certification campaign assigned to the identity's manager.",
          displayName: "Create Certification Campaign",
          nextStep: "Send Email",
          type: "action",
          versionNumber: 2,
        },
        "Get Accounts": {
          actionId: "sp:get-accounts",
          attributes: { getAccountsBy: "specificIdentity", "identity.$": "$.trigger.identityAttributes.id" },
          description: "This action returns the identity's current list of accounts.",
          displayName: "Get Identity's Accounts",
          nextStep: "Manage Accounts",
          type: "action",
          versionNumber: 1,
        },
        "Get Identity": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.trigger.identityAttributes.id" },
          description: "This action returns attributes associated with the identity.",
          displayName: "Get Identity",
          nextStep: "Get Accounts",
          type: "action",
          versionNumber: 2,
        },
        "Get Identity 1": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.getIdentity.managerRef.id" },
          description: "This action returns the name and other attributes about the identity's manager.",
          displayName: "Get Identity's Manager",
          nextStep: "Create Certification Campaign",
          type: "action",
          versionNumber: 2,
        },
        "Manage Accounts": {
          actionId: "sp:manage-account",
          attributes: {
            "accountIds.$":
              '$.getAccounts.accounts[?(@.sourceId=="8c63bd999dd74afcb4e344ba0466ae9b" || @.sourceId=="ca713180aecb4ad3b424446335af000d")].id',
            operation: "disable",
          },
          description: "This action disables the identity's PRISM and Active Directory accounts.",
          displayName: "Disable Accounts",
          nextStep: "Get Identity 1",
          type: "action",
          versionNumber: 1,
        },
        "Send Email": {
          actionId: "sp:send-email",
          attributes: {
            subject: "Credential Change Detected — Certification Campaign Assigned",
            "recipientEmailList.$": "$.getIdentity1.attributes.email",
            carbonCopy: ["alexa.delgado@sailpoint.com"],
            body: buildEmailBody({
              bannerLabel: "CREDENTIAL CHANGE",
              introSentence:
                "A <strong>credential-change</strong> security signal was detected for your direct report, <strong>${var2}</strong>. SailPoint has automatically taken remediation action on their account.",
              actionTakenHtml: DISABLE_PRISM_AD_ACTION,
            }),
            context: emailContext(CREDENTIAL_CHANGE_URI),
          },
          description: "Notifies the identity's manager with campaign detail.",
          displayName: "Send Email",
          nextStep: "success 1",
          type: "action",
          versionNumber: 2,
        },
        "success 1": {
          actionId: "sp:operator-success",
          description: "Accounts disabled, campaign created, manager notified. Success.",
          displayName: "End Step - Success",
          type: "success",
        },
      },
    },
  },
  {
    id: "5d05d1f5-e20f-4897-83fb-a893ec62ac1f",
    label: "session-revoked",
    definition: {
      start: "Get Identity",
      steps: {
        "Create Certification Campaign": {
          actionId: "sp:create-campaign",
          attributes: {
            activateUponCreation: true,
            description: "Session revoked access review, triggered by the SSF Threat Signal Transmitter.",
            duration: "30d",
            emailNotificationEnabled: true,
            name: "Session Revoked Access Review",
            reviewerCertificationType: "IDENTITY",
            "reviewerId.$": "$.getIdentity.managerRef.id",
            "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
            type: "REVIEWER_IDENTITY",
          },
          description: "Creates a certification campaign assigned to the identity's manager.",
          displayName: "Create Certification Campaign",
          nextStep: "Send Email",
          type: "action",
          versionNumber: 2,
        },
        "Get Accounts": {
          actionId: "sp:get-accounts",
          attributes: { getAccountsBy: "specificIdentity", "identity.$": "$.trigger.identityAttributes.id" },
          description: "This action returns the identity's current list of accounts.",
          displayName: "Get Identity's Accounts",
          nextStep: "Manage Accounts",
          type: "action",
          versionNumber: 1,
        },
        "Get Identity": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.trigger.identityAttributes.id" },
          description: "This action returns attributes associated with the identity.",
          displayName: "Get Identity",
          nextStep: "Get Accounts",
          type: "action",
          versionNumber: 2,
        },
        "Get Identity 1": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.getIdentity.managerRef.id" },
          description: "This action returns the name and other attributes about the identity's manager.",
          displayName: "Get Identity's Manager",
          nextStep: "Create Certification Campaign",
          type: "action",
          versionNumber: 2,
        },
        "Manage Accounts": {
          actionId: "sp:manage-account",
          attributes: {
            "accountIds.$":
              '$.getAccounts.accounts[?(@.sourceId=="8c63bd999dd74afcb4e344ba0466ae9b" || @.sourceId=="ca713180aecb4ad3b424446335af000d")].id',
            operation: "disable",
          },
          description: "This action disables the identity's PRISM and Active Directory accounts.",
          displayName: "Disable Accounts",
          nextStep: "Get Identity 1",
          type: "action",
          versionNumber: 1,
        },
        "Send Email": {
          actionId: "sp:send-email",
          attributes: {
            subject: "Session Revoked — Certification Campaign Assigned",
            "recipientEmailList.$": "$.getIdentity1.attributes.email",
            carbonCopy: ["alexa.delgado@sailpoint.com"],
            body: buildEmailBody({
              bannerLabel: "SESSION REVOKED",
              introSentence:
                "A suspicious <strong>session-revoked</strong> security signal was detected for your direct report, <strong>${var2}</strong>. SailPoint has automatically taken remediation action on their account.",
              actionTakenHtml: DISABLE_PRISM_AD_ACTION,
            }),
            context: emailContext(SESSION_REVOKED_URI),
          },
          description: "Notifies the identity's manager with campaign detail.",
          displayName: "Send Email",
          nextStep: "success 1",
          type: "action",
          versionNumber: 2,
        },
        "success 1": {
          actionId: "sp:operator-success",
          description: "Accounts disabled, campaign created, manager notified. Success.",
          displayName: "End Step - Success",
          type: "success",
        },
      },
    },
  },
  {
    id: "089b0904-af1d-409d-bae9-2fe4e6dfa3b2",
    label: "token-claims-change",
    definition: {
      start: "Get Identity",
      steps: {
        "Create Certification Campaign": {
          actionId: "sp:create-campaign",
          attributes: {
            activateUponCreation: true,
            description: "Emergency access review triggered by a token-claims-change signal via the SSF Threat Signal Transmitter.",
            duration: "30d",
            emailNotificationEnabled: true,
            name: "Emergency Access Review",
            reviewerCertificationType: "IDENTITY",
            "reviewerId.$": "$.getIdentity.managerRef.id",
            "reviewerIdentitiesToCertify.$": "$.trigger.identityAttributes.id",
            type: "REVIEWER_IDENTITY",
          },
          description: "Generates a certification campaign for an identity when their claims have changed.",
          displayName: "Create Certification Campaign",
          nextStep: "Send Email",
          type: "action",
          versionNumber: 2,
        },
        "Get Identity": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.trigger.identityAttributes.id" },
          description: "This action returns attributes associated with the identity.",
          displayName: "Get Identity",
          nextStep: "Get Identity 1",
          type: "action",
          versionNumber: 2,
        },
        "Get Identity 1": {
          actionId: "sp:get-identity",
          attributes: { "id.$": "$.getIdentity.managerRef.id" },
          description: "This action returns the name and other attributes about the identity's manager.",
          displayName: "Get Identity's Manager",
          nextStep: "Create Certification Campaign",
          type: "action",
          versionNumber: 2,
        },
        "Send Email": {
          actionId: "sp:send-email",
          attributes: {
            subject: "Token Claims Change — Certification Campaign Assigned",
            "recipientEmailList.$": "$.getIdentity1.attributes.email",
            carbonCopy: ["alexa.delgado@sailpoint.com"],
            body: buildEmailBody({
              bannerLabel: "TOKEN CLAIMS CHANGE",
              introSentence:
                "A <strong>token-claims-change</strong> security signal was detected for your direct report, <strong>${var2}</strong>.",
              actionTakenHtml: CAMPAIGN_ONLY_ACTION,
            }),
            context: emailContext(TOKEN_CLAIMS_URI),
          },
          description:
            "This action sends an email notification to the identity's manager alerting them that a certification campaign has been assigned to them for a token claims change. The email includes the identity, the identity's claims that have changed, and the campaign name.",
          displayName: "Send Email",
          nextStep: "success 1",
          type: "action",
          versionNumber: 2,
        },
        "success 1": {
          actionId: "sp:operator-success",
          description: "A certification campaign has been created and the manager has been notified. The workflow has completed successfully.",
          displayName: "End Step - Success",
          type: "success",
        },
      },
    },
  },
];

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

  for (const wf of WORKFLOWS) {
    console.log(`\n=== ${wf.label} (${wf.id}) ===`);
    console.log("disabling...", (await patchWorkflow(apiBase, auth, wf.id, [{ op: "replace", path: "/enabled", value: false }])).status);

    const defResult = await patchWorkflow(apiBase, auth, wf.id, [
      { op: "replace", path: "/definition", value: wf.definition },
    ]);
    console.log("updating definition...", defResult.status, defResult.ok ? "" : defResult.text.slice(0, 400));

    console.log("re-enabling...", (await patchWorkflow(apiBase, auth, wf.id, [{ op: "replace", path: "/enabled", value: true }])).status);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
